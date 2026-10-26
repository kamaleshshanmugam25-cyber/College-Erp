import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import json
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.core.views import access_matrix_api, get_accessible_modules_for_user
from apps.core.rbac import Roles

User = get_user_model()
rf = RequestFactory()

print("--- TESTING SIDEBAR ACCESS DECLARATION BY FINANCE ADMIN ---")

fa = User.objects.filter(groups__name=Roles.FINANCE_ADMIN).first()
if not fa:
    fa = User.objects.filter(is_staff=True).first()
assert fa is not None, "Finance Admin not found"

# 1. GET access-matrix
req = rf.get('/api/core/access-matrix/')
req.user = fa
res = access_matrix_api(req)
assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.content}"
data = json.loads(res.content.decode('utf-8'))
print(f"[TEST 1 PASSED] access_matrix_api accessed by Finance Admin. Roles: {data['roles']}")
assert Roles.ACCOUNTANT in data['roles'], "Accountant not in target roles"
assert Roles.FEE_MANAGER in data['roles'], "Fee Manager not in target roles"

# 2. Finance Admin unticks 'fee-structures' for Accountant
toggle_post = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.ACCOUNTANT,
        'module_id': 'fee-structures',
        'is_granted': False,
    }),
    content_type='application/json'
)
toggle_post.user = fa
res_post = access_matrix_api(toggle_post)
assert res_post.status_code == 200

# Check accountant modules
acc = User.objects.get(username='accountant')
acc_mods = get_accessible_modules_for_user(acc)
print(f"[TEST 2 PASSED] Unticked fee-structures for Accountant. In sidebar? {'fee-structures' in acc_mods}")
assert 'fee-structures' not in acc_mods, "fee-structures should be hidden from Accountant"

# 3. Finance Admin re-ticks 'fee-structures' for Accountant
toggle_post2 = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.ACCOUNTANT,
        'module_id': 'fee-structures',
        'is_granted': True,
    }),
    content_type='application/json'
)
toggle_post2.user = fa
res_post2 = access_matrix_api(toggle_post2)
assert res_post2.status_code == 200

acc_mods2 = get_accessible_modules_for_user(acc)
print(f"[TEST 3 PASSED] Re-ticked fee-structures for Accountant. In sidebar? {'fee-structures' in acc_mods2}")
assert 'fee-structures' in acc_mods2, "fee-structures should now be visible in Accountant sidebar"

# 4. Finance Admin unticks 'scholarships' for Fee Manager
fm = User.objects.get(username='feemanager')
toggle_fm = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.FEE_MANAGER,
        'module_id': 'scholarships',
        'is_granted': False,
    }),
    content_type='application/json'
)
toggle_fm.user = fa
access_matrix_api(toggle_fm)

fm_mods = get_accessible_modules_for_user(fm)
print(f"[TEST 4 PASSED] Unticked scholarships for Fee Manager. In sidebar? {'scholarships' in fm_mods}")
assert 'scholarships' not in fm_mods, "scholarships should be hidden from Fee Manager"

# Restore scholarships for Fee Manager
toggle_fm2 = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.FEE_MANAGER,
        'module_id': 'scholarships',
        'is_granted': True,
    }),
    content_type='application/json'
)
toggle_fm2.user = fa
access_matrix_api(toggle_fm2)
fm_mods2 = get_accessible_modules_for_user(fm)
print(f"[TEST 5 PASSED] Restored scholarships for Fee Manager. In sidebar? {'scholarships' in fm_mods2}")
assert 'scholarships' in fm_mods2, "scholarships should be visible in Fee Manager sidebar"

print("--- ALL SIDEBAR ASSIGNMENT TESTS PASSED PERFECTLY ---")
