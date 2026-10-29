"""
Apex University ERP — Automated API Test Runner
Executes the comprehensive 31-endpoint test suite against http://127.0.0.1:8000,
verifying HTTP status codes, session persistence, double-entry invariants, and security rules.
"""
import http.cookiejar
import json
import re
import sys
import time
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

class TestResult:
    def __init__(self, name, method, endpoint, status_code, expected_status, success, error_msg=""):
        self.name = name
        self.method = method
        self.endpoint = endpoint
        self.status_code = status_code
        self.expected_status = expected_status
        self.success = success
        self.error_msg = error_msg

def main():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    results = []

    print("=" * 80)
    print(" APEX UNIVERSITY ERP — ENTERPRISE API TEST RUNNER")
    print(f" Target Server: {BASE_URL}")
    print("=" * 80)

    # 1. CSRF Token
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/auth/csrf/")
        resp = opener.open(req)
        data = json.loads(resp.read().decode("utf-8"))
        csrf_token = data.get("csrfToken", "")
        success = (resp.status == 200 and bool(csrf_token))
        results.append(TestResult("01. Retrieve CSRF Token", "GET", "/api/auth/csrf/", resp.status, 200, success))
    except Exception as e:
        results.append(TestResult("01. Retrieve CSRF Token", "GET", "/api/auth/csrf/", 0, 200, False, str(e)))
        csrf_token = ""

    # Helper function for requests
    def execute_request(name, method, endpoint, payload=None, expected_status=200, use_auth=True, custom_headers=None):
        url = f"{BASE_URL}{endpoint}"
        
        # Dynamically fetch latest CSRF token from active cookies
        active_csrf = csrf_token
        if use_auth:
            for c in cj:
                if c.name == "csrftoken":
                    active_csrf = c.value
                    break

        headers = {
            "Content-Type": "application/json",
            "X-CSRFToken": active_csrf,
            "Origin": "http://localhost:5174",
            "Referer": "http://localhost:5174/",
        }
        if custom_headers:
            headers.update(custom_headers)

        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        target_opener = opener if use_auth else urllib.request.build_opener()

        try:
            resp = target_opener.open(req)
            body = resp.read().decode("utf-8")
            status = resp.status
            success = (status == expected_status)
            results.append(TestResult(name, method, endpoint, status, expected_status, success))
            try:
                return status, json.loads(body)
            except Exception:
                return status, body
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode("utf-8")
            success = (status == expected_status)
            results.append(TestResult(name, method, endpoint, status, expected_status, success))
            if not success:
                try:
                    with open("tests/api/last_error.html", "w", encoding="utf-8") as f:
                        f.write(body)
                except Exception:
                    pass
            try:
                return status, json.loads(body)
            except Exception:
                return status, body
        except Exception as e:
            results.append(TestResult(name, method, endpoint, 0, expected_status, False, str(e)))
            return 0, str(e)

    # 2. SuperAdmin Login
    execute_request("02. SuperAdmin Credential Login", "POST", "/api/auth/login/",
                    payload={"username": "admin", "password": "password123"}, expected_status=200)

    # 3. Active Session Profile
    execute_request("03. Verify Active Session (/api/auth/me/)", "GET", "/api/auth/me/", expected_status=200)

    # 4. Invalid Password Rejection (Negative test)
    execute_request("04. Reject Invalid Password", "POST", "/api/auth/login/",
                    payload={"username": "admin", "password": "wrong_password_xyz"}, expected_status=401)

    # 5. Security Regression: demo_role Auth Bypass (BUG-001)
    execute_request("05. Reject demo_role Auth Bypass (BUG-001)", "POST", "/api/auth/login/",
                    payload={"demo_role": "Super Admin"}, expected_status=400)

    # 6. Finance Dashboard
    execute_request("06. Finance Dashboard Metrics", "GET", "/api/finance/dashboard/", expected_status=200)

    # 7. Finance Metadata
    _, meta_data = execute_request("07. Finance Metadata (Courses & Quotas)", "GET", "/api/finance/meta/", expected_status=200)
    course_id = 1
    quota_id = 2
    if isinstance(meta_data, dict):
        if meta_data.get("courses") and len(meta_data["courses"]) > 0:
            course_id = meta_data["courses"][0]["id"]
        if meta_data.get("quotas") and len(meta_data["quotas"]) > 0:
            quota_id = meta_data["quotas"][0]["id"]

    # 8. Fee Calculator
    execute_request("08. Fee Calculator & Schedule Split", "POST", "/api/finance/calculator/",
                    payload={"course": course_id, "quota": quota_id, "installments": 3}, expected_status=200)

    # 9. Invoices & Receipts List
    execute_request("09. Invoices & Official Receipts List", "GET", "/api/invoices/", expected_status=200)

    # 10. Financial Reports & Statements
    execute_request("10. Audited Financial Reports", "GET", "/api/finance/reports/", expected_status=200)

    # 11. GST Exemption Compliance
    execute_request("11. GST Statutory SAC 9992 Compliance", "GET", "/api/finance/tax-compliance/", expected_status=200)

    # 12. General Ledger
    execute_request("12. General Ledger Transactions", "GET", "/api/ledger/general/", expected_status=200)

    # 13. Account Group Balances
    execute_request("13. Account Group Balances", "GET", "/api/ledger/general/account_balances/", expected_status=200)

    # 14. Journal Vouchers Directory
    execute_request("14. Journal Vouchers Directory", "GET", "/api/ledger/vouchers/", expected_status=200)

    # 15. Post Balanced Journal Voucher
    execute_request("15. Post Balanced Double-Entry Voucher", "POST", "/api/ledger/vouchers/",
                    payload={
                        "voucher_type": "JOURNAL",
                        "narration": "Automated Postman Test Voucher",
                        "reference": f"RUNNER-TEST-{int(time.time())}",
                        "entries": [
                            {"account_group": "BANK", "debit": 100, "credit": 0},
                            {"account_group": "FEE_INCOME", "debit": 0, "credit": 100}
                        ]
                    }, expected_status=201)

    # 16. Post Unbalanced Voucher Rejection (Negative test)
    execute_request("16. Reject Unbalanced Journal Voucher", "POST", "/api/ledger/vouchers/",
                    payload={
                        "voucher_type": "JOURNAL",
                        "narration": "Unbalanced Error Test",
                        "entries": [
                            {"account_group": "BANK", "debit": 500, "credit": 0},
                            {"account_group": "FEE_INCOME", "debit": 0, "credit": 400}
                        ]
                    }, expected_status=400)

    # 17. Student Dues
    execute_request("17. Student Dues & Milestones", "GET", "/api/portal/dues/", expected_status=200)

    # 18. Student Scholarships
    execute_request("18. Student Concessions & Scholarships", "GET", "/api/portal/my-scholarships/", expected_status=200)

    # 19. Receipts List
    execute_request("19. Official Fee Receipts List", "GET", "/api/receipts/", expected_status=200)

    # 20. Employee Directory
    execute_request("20. Staff Lifecycle & Employee Directory", "GET", "/api/hr/employees/", expected_status=200)

    # 21. Attendance Logs
    execute_request("21. Biometric Attendance Logs", "GET", "/api/attendance/", expected_status=200)

    # 22. Leave Applications
    execute_request("22. Staff Leave Applications", "GET", "/api/leaves/", expected_status=200)

    # 23. Salary Payslips
    execute_request("23. Faculty Salary Payslips", "GET", "/api/portal/payslips/", expected_status=200)

    # 24. Staff Performance Appraisals
    execute_request("24. Staff Appraisals & Ratings", "GET", "/api/hr/employees/appraisals/", expected_status=200)

    # 25. HR Statutory Compliance
    execute_request("25. HR Statutory EPF/ESI/TDS Rules", "GET", "/api/hr/statutory-compliance/", expected_status=200)

    # 26. Holiday Calendar
    _, holiday_data = execute_request("26. Declared Holiday Calendar", "GET", "/api/holidays/", expected_status=200)

    # 27. Declare New Holiday
    existing_dates = set()
    if isinstance(holiday_data, list):
        existing_dates = {h.get("date") for h in holiday_data if isinstance(h, dict)}
    elif isinstance(holiday_data, dict) and "results" in holiday_data:
        existing_dates = {h.get("date") for h in holiday_data["results"] if isinstance(h, dict)}

    import datetime
    test_date = datetime.date(2028, 1, 1)
    while test_date.isoformat() in existing_dates:
        test_date += datetime.timedelta(days=1)

    h_status, h_res = execute_request("27. Declare New Holiday Circular", "POST", "/api/holidays/",
                    payload={
                        "name": f"Runner Holiday {int(time.time()) % 1000}",
                        "date": test_date.isoformat(),
                        "holiday_type": "ACADEMIC",
                        "description": "Automated API Test Notification"
                    }, expected_status=201)

    # Immediate clean up of created holiday via DELETE API
    if h_status == 201 and isinstance(h_res, dict) and h_res.get("id"):
        execute_request("Cleanup Test Holiday", "DELETE", f"/api/holidays/{h_res['id']}/", expected_status=204)
        results.pop()  # Keep total test count clean at 35

    # 28. Admin Users Registry
    execute_request("28. Admin Users Registry", "GET", "/api/admin/users/", expected_status=200)

    # 29. Role Permissions Matrix
    execute_request("29. Role Permissions Matrix", "GET", "/api/admin/permissions/", expected_status=200)

    # 30. Security Audit Logs
    execute_request("30. System Security Audit Logs", "GET", "/api/admin/audit-logs/", expected_status=200)

    # 31. System Operational Health
    execute_request("31. System Operational Health & Engine", "GET", "/api/system/info/", expected_status=200)

    # 32-35. Security & Negative Authorization Regression Tests
    execute_request("32. Security Regression: Anonymous Ledger Rejected (BUG-002)", "GET", "/api/ledger/general/",
                    expected_status=403, use_auth=False)
    execute_request("33. Security Regression: Anonymous Voucher Post Rejected (BUG-002)", "POST", "/api/ledger/vouchers/",
                    payload={"voucher_type": "JOURNAL"}, expected_status=403, use_auth=False)
    execute_request("34. Security Regression: Anonymous Appraisals Rejected (BUG-003)", "GET", "/api/hr/employees/appraisals/",
                    expected_status=403, use_auth=False)
    execute_request("35. Security Regression: Anonymous Holiday Post Rejected (BUG-004)", "POST", "/api/holidays/",
                    payload={"name": "Hacked", "date": "2026-12-05"}, expected_status=403, use_auth=False)



    # Clean up any transient test records from db.sqlite3
    try:
        import sqlite3
        con = sqlite3.connect("backend/db.sqlite3")
        con.execute("DELETE FROM hr_holiday WHERE name LIKE 'Runner Holiday%'")
        con.commit()
        con.close()
    except Exception:
        pass

    # Print Summary Table
    print("\n" + "-" * 80)
    print(f"{'TEST CASE NAME':<50} | {'METHOD':<6} | {'ACTUAL':<6} | {'EXP':<5} | {'STATUS'}")
    print("-" * 80)
    passed_count = 0
    for r in results:
        status_text = "PASS" if r.success else "FAIL"
        if r.success:
            passed_count += 1
        print(f"{r.name:<50} | {r.method:<6} | {r.status_code:<6} | {r.expected_status:<5} | {status_text}")
        if not r.success and r.error_msg:
            print(f"   -> Detail: {r.error_msg}")
    print("-" * 80)
    total_count = len(results)
    pass_pct = (passed_count / total_count) * 100
    print(f" TOTAL TESTS: {total_count}  |  PASSED: {passed_count}  |  FAILED: {total_count - passed_count}  |  PASS RATE: {pass_pct:.1f}%")
    print("=" * 80)

    if passed_count == total_count:
        print(">>> ALL 35 API FUNCTIONAL, RBAC, AND SECURITY TESTS PASSED SUCCESSFULLY! <<<\n")
        return 0
    else:
        print(">>> SOME TESTS FAILED. CHECK LOGS ABOVE. <<<\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
