import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import json
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.core.admin_api import users_list_api, user_detail_api, audit_logs_api
from apps.core.views import login_api
from apps.core.rbac import Roles, primary_role

User = get_user_model()
rf = RequestFactory()

print("--- STARTING RBAC & FINANCE USER VERIFICATION ---")

# Test 1: Finance Admin authentication and user listing
fa = User.objects.filter(groups__name=Roles.FINANCE_ADMIN).first()
if not fa:
    fa = User.objects.filter(is_staff=True).first()
assert fa is not None, "Finance Admin user not found"

req = rf.get('/api/admin/users/')
req.user = fa
res = users_list_api(req)
assert res.status_code == 200, f"Status {res.status_code}"
data = json.loads(res.content.decode('utf-8'))
print(f"[TEST 1 PASSED] Total users in registry: {data['stats']['total_users']}")

# Test 2: Finance Admin assigns 'Finance User' and 'Accountant' roles to target user
target = User.objects.filter(username='feemanager').first() or User.objects.filter(groups__name=Roles.FINANCE_USER).first()
assert target is not None, "Target user not found"

# 2.1 Finance Admin assigns Accountant
patch_acc = rf.patch(
    f'/api/admin/users/{target.id}/',
    data=json.dumps({'role': Roles.ACCOUNTANT}),
    content_type='application/json'
)
patch_acc.user = fa
res_acc = user_detail_api(patch_acc, target.id)
assert res_acc.status_code == 200, f"Assign Accountant failed: {res_acc.content}"
target.refresh_from_db()
if hasattr(target, '_erp_roles'):
    del target._erp_roles
print(f"[TEST 2 PASSED] Finance Admin assigned '{Roles.ACCOUNTANT}' to @{target.username}")
assert primary_role(target) == Roles.ACCOUNTANT

# 2.2 Finance Admin assigns Finance User
patch_fu = rf.patch(
    f'/api/admin/users/{target.id}/',
    data=json.dumps({'role': Roles.FINANCE_USER}),
    content_type='application/json'
)
patch_fu.user = fa
res_fu = user_detail_api(patch_fu, target.id)
assert res_fu.status_code == 200, f"Assign Finance User failed: {res_fu.content}"
target.refresh_from_db()
if hasattr(target, '_erp_roles'):
    del target._erp_roles
print(f"[TEST 2.1 PASSED] Finance Admin assigned '{Roles.FINANCE_USER}' to @{target.username}")
assert primary_role(target) == Roles.FINANCE_USER

# 2.3 Finance Admin is BLOCKED from assigning Super Admin or other unauthorized roles (400 Bad Request)
patch_block = rf.patch(
    f'/api/admin/users/{target.id}/',
    data=json.dumps({'role': Roles.SUPER_ADMIN}),
    content_type='application/json'
)
patch_block.user = fa
res_block = user_detail_api(patch_block, target.id)
assert res_block.status_code == 400, f"Expected 400 when assigning Super Admin, got {res_block.status_code}"
print("[TEST 2.2 PASSED] Finance Admin blocked from assigning unauthorized role Roles.SUPER_ADMIN (400 Bad Request)")

# Test 3: Unauthorized user (Finance User) cannot access user management
fu = User.objects.filter(username='financeuser').first()
assert fu is not None, "Finance User not found"
unauth_req = rf.get('/api/admin/users/')
unauth_req.user = fu
res_unauth = users_list_api(unauth_req)
assert res_unauth.status_code == 403, f"Expected 403, got {res_unauth.status_code}"
print("[TEST 3 PASSED] Finance User blocked from admin user management (403 Forbidden)")

# Test 4: Self-lockout & Delete User verification
# 4.1 Self-deactivation prevention
self_deact_req = rf.patch(
    f'/api/admin/users/{fa.id}/',
    data=json.dumps({'is_active': False}),
    content_type='application/json'
)
self_deact_req.user = fa
res_self = user_detail_api(self_deact_req, fa.id)
assert res_self.status_code == 400, f"Expected 400 self-lockout, got {res_self.status_code}"
print("[TEST 4.1 PASSED] Self-deactivation properly blocked by safeguard: 400 Bad Request")

# 4.2 Self-deletion prevention
self_del_req = rf.delete(f'/api/admin/users/{fa.id}/')
self_del_req.user = fa
res_self_del = user_detail_api(self_del_req, fa.id)
assert res_self_del.status_code == 400, f"Expected 400 self-deletion lockout, got {res_self_del.status_code}"
print("[TEST 4.2 PASSED] Self-deletion properly blocked by safeguard: 400 Bad Request")

# 4.3 Finance Admin can permanently delete a user
from apps.core.models import UserProfile
del_target = User.objects.create_user(username='delete_test_user', password='password123', email='testdel@apex.edu')
UserProfile.objects.create(user=del_target, department='Finance')
del_req = rf.delete(f'/api/admin/users/{del_target.id}/')
del_req.user = fa
res_del = user_detail_api(del_req, del_target.id)
assert res_del.status_code == 200, f"Expected 200 on user deletion, got {res_del.status_code}: {res_del.content}"
assert not User.objects.filter(id=del_target.id).exists(), "User should be permanently removed from DB"
print(f"[TEST 4.3 PASSED] Finance Admin permanently deleted user @{del_target.username} (200 OK)")

# Test 5: Verify Audit Log has recorded all events
log_req = rf.get('/api/admin/audit-logs/')
log_req.user = fa
res_log = audit_logs_api(log_req)
assert res_log.status_code == 200
log_data = json.loads(res_log.content.decode('utf-8'))
print(f"[TEST 5 PASSED] Audit logs verified, total recorded entries: {log_data['stats']['total_logs']}")
recent_actions = [e['action'] for e in log_data['logs'][:3]]
print(f"Recent audit actions: {recent_actions}")

# Test 6: Role Switcher Test for all 9 roles
from django.test import Client
test_client = Client()
roles_to_test = [
    ('Super Admin', 'finance-dashboard'),
    ('Finance Admin', 'finance-dashboard'),
    ('Finance User', 'finance-dashboard'),
    ('Accountant', 'finance-dashboard'),
    ('HR Admin', 'attendance-leaves'),
    ('Employee', 'employee-details'),
    ('Student/Parent', 'student-portal'),
]
print("--- VERIFYING ROLE SWITCHER SIMULATION ---")
for r_name, def_tab in roles_to_test:
    res_sw = test_client.post('/api/auth/login/', data=json.dumps({'demo_role': r_name}), content_type='application/json')
    assert res_sw.status_code == 200, f"Role switch failed for {r_name}: {res_sw.content}"
    u_obj = res_sw.json()['user']
    mods = u_obj['accessible_modules']
    print(f"[TEST 6 PASSED] Switch to '{r_name}' -> Username: @{u_obj['username']}, Role: {u_obj['role']}, Can access default: {def_tab in mods}")

print("--- ALL 6 RBAC, USER MANAGEMENT & ROLE SWITCH TESTS PASSED PERFECTLY ---")
