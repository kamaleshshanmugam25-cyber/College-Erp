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
assert Roles.FINANCE_USER in data['roles']

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

# 5. Verify Finance User default modules do NOT include invoices-receipts
fu = User.objects.get(username='financeuser')
fu_mods = get_accessible_modules_for_user(fu)
print(f"[TEST 5 PASSED] Finance User accessible modules: {fu_mods}")
assert 'invoices-receipts' not in fu_mods, "invoices-receipts should NOT be accessible by Finance User!"
assert 'fee-structures' in fu_mods, "fee-structures should be accessible by Finance User"

# 6. Super Admin ticks 'scholarships' for Finance User and then unticks
toggle_fu = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.FINANCE_USER,
        'module_id': 'scholarships',
        'is_granted': True,
    }),
    content_type='application/json'
)
toggle_fu.user = su
access_matrix_api(toggle_fu)

fu_mods_granted = get_accessible_modules_for_user(fu)
print(f"[TEST 6 PASSED] Granted scholarships for Finance User. In sidebar? {'scholarships' in fu_mods_granted}")
assert 'scholarships' in fu_mods_granted

# Restore by unticking scholarships
toggle_fu2 = rf.post(
    '/api/core/access-matrix/',
    data=json.dumps({
        'role': Roles.FINANCE_USER,
        'module_id': 'scholarships',
        'is_granted': False,
    }),
    content_type='application/json'
)
toggle_fu2.user = su
access_matrix_api(toggle_fu2)
fu_mods_restored = get_accessible_modules_for_user(fu)
assert 'scholarships' not in fu_mods_restored
print("[TEST 7 PASSED] Restored scholarships unticked for Finance User.")

print("--- ALL SUPER ADMIN ACCESS CONTROL TESTS PASSED PERFECTLY ---")
