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

print("--- TESTING ADMINISTRATION & SECURITY SUPER ADMIN ACCESS CONTROL ---")

su = User.objects.filter(is_superuser=True).first()
assert su is not None, "Super Admin not found"

fa = User.objects.filter(groups__name=Roles.FINANCE_ADMIN).first()
assert fa is not None, "Finance Admin not found"

# 1. Finance Admin blocked from access_matrix_api (403 Forbidden)
req_fa = rf.get('/api/core/access-matrix/')
req_fa.user = fa
res_fa = access_matrix_api(req_fa)
assert res_fa.status_code == 403, f"Expected 403 for Finance Admin, got {res_fa.status_code}"
print("[TEST 1 PASSED] Finance Admin blocked from Administration & Security (403 Forbidden)")

# 2. Super Admin GET access-matrix
req_su = rf.get('/api/core/access-matrix/')
req_su.user = su
res_su = access_matrix_api(req_su)
assert res_su.status_code == 200, f"Expected 200 for Super Admin, got {res_su.status_code}"
data = json.loads(res_su.content.decode('utf-8'))
print(f"[TEST 2 PASSED] access_matrix_api accessed by Super Admin. Roles: {data['roles']}")
assert Roles.ACCOUNTANT in data['roles']
assert Roles.FEE_MANAGER in data['roles']

# 3. Super Admin unticks 'fee-structures' for Accountant
toggle_post = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.ACCOUNTANT,
        'module_id': 'fee-structures',
        'is_granted': False,
    }),
    content_type='application/json'
)
toggle_post.user = su
res_post = access_matrix_api(toggle_post)
assert res_post.status_code == 200

# Check accountant modules
acc = User.objects.get(username='accountant')
acc_mods = get_accessible_modules_for_user(acc)
print(f"[TEST 3 PASSED] Unticked fee-structures for Accountant. In sidebar? {'fee-structures' in acc_mods}")
assert 'fee-structures' not in acc_mods

# 4. Super Admin re-ticks 'fee-structures' for Accountant
toggle_post2 = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.ACCOUNTANT,
        'module_id': 'fee-structures',
        'is_granted': True,
    }),
    content_type='application/json'
)
toggle_post2.user = su
res_post2 = access_matrix_api(toggle_post2)
assert res_post2.status_code == 200

acc_mods2 = get_accessible_modules_for_user(acc)
print(f"[TEST 4 PASSED] Re-ticked fee-structures for Accountant. In sidebar? {'fee-structures' in acc_mods2}")
assert 'fee-structures' in acc_mods2

# 5. Super Admin unticks 'scholarships' for Fee Manager
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
toggle_fm.user = su
access_matrix_api(toggle_fm)

fm_mods = get_accessible_modules_for_user(fm)
print(f"[TEST 5 PASSED] Unticked scholarships for Fee Manager. In sidebar? {'scholarships' in fm_mods}")
assert 'scholarships' not in fm_mods

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
toggle_fm2.user = su
access_matrix_api(toggle_fm2)
fm_mods2 = get_accessible_modules_for_user(fm)
assert 'scholarships' in fm_mods2
print("[TEST 6 PASSED] Restored scholarships for Fee Manager. In sidebar? True")

print("--- ALL SUPER ADMIN ACCESS CONTROL TESTS PASSED PERFECTLY ---")
