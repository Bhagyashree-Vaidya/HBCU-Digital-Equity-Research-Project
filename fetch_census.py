"""
HBCU Digital Equity Dashboard — Census ACS Data Fetcher
========================================================
One-time script to pull real American Community Survey (ACS) 5-Year data
from the US Census Bureau API for each HBCU school's county.

Prerequisites:
  1. Get a free API key at: https://api.census.gov/data/key_signup.html
  2. pip install requests

Usage:
  python fetch_census.py --key YOUR_API_KEY

Output:
  Overwrites data/hbcu_schools.json with real Census values.
"""

import argparse
import json
import os
import sys
import time
import requests

# ACS 5-Year 2022 endpoint
ACS_BASE = "https://api.census.gov/data/2022/acs/acs5"

# Variables to fetch
# B19013_001E  = Median household income
# B15003_001E  = Total pop 25+ (education denominator)
# B15003_022E  = Bachelor's degree
# B15003_023E  = Master's degree
# B15003_024E  = Professional degree
# B15003_025E  = Doctorate
# B28002_001E  = Total households (internet denominator)
# B28002_002E  = With an internet subscription
# B27001_001E  = Total pop (health insurance denominator)
# B27001_005E  = Under 19 no insurance (male)  — simplified; full calc needs more vars
# We'll compute uninsured from B27010 for simplicity

VARIABLES = [
    "B19013_001E",   # median income
    "B15003_001E",   # education total (25+)
    "B15003_017E",   # regular HS diploma
    "B15003_018E",   # GED
    "B15003_019E",   # some college <1yr
    "B15003_020E",   # some college 1+yr
    "B15003_021E",   # associate's
    "B15003_022E",   # bachelor's
    "B15003_023E",   # master's
    "B15003_024E",   # professional
    "B15003_025E",   # doctorate
    "B28002_001E",   # internet total
    "B28002_002E",   # with internet
    "B27010_001E",   # health insurance total
    "B27010_017E",   # no insurance 19-34
    "B27010_033E",   # no insurance 35-64
    "B27010_050E",   # no insurance 65+
    "B17001_001E",   # poverty total
    "B17001_002E",   # below poverty line
    "B23025_001E",   # employment total (16+)
    "B23025_003E",   # in labor force - civilian
    "B23025_004E",   # employed - civilian
]


def fetch_county_data(state_fips, county_fips, api_key):
    """Fetch ACS data for a specific county."""
    vars_str = ",".join(VARIABLES)
    url = (
        f"{ACS_BASE}?get={vars_str}"
        f"&for=county:{county_fips}"
        f"&in=state:{state_fips}"
        f"&key={api_key}"
    )
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if len(data) < 2:
            return None
        headers = data[0]
        values = data[1]
        return dict(zip(headers, values))
    except Exception as e:
        print(f"  Warning: Could not fetch {state_fips}/{county_fips}: {e}")
        return None


def parse_int(val):
    """Safely parse Census value (can be None or negative for missing)."""
    try:
        v = int(val)
        return v if v >= 0 else None
    except (TypeError, ValueError):
        return None


def compute_metrics(raw):
    """Compute our 5 metrics from raw Census variables."""
    if raw is None:
        return None

    median_income = parse_int(raw.get("B19013_001E"))

    # Education: % with bachelor's or higher
    ed_total = parse_int(raw.get("B15003_001E"))
    ed_bach = parse_int(raw.get("B15003_022E")) or 0
    ed_mast = parse_int(raw.get("B15003_023E")) or 0
    ed_prof = parse_int(raw.get("B15003_024E")) or 0
    ed_doct = parse_int(raw.get("B15003_025E")) or 0
    pct_bachelors = None
    if ed_total and ed_total > 0:
        pct_bachelors = round(((ed_bach + ed_mast + ed_prof + ed_doct) / ed_total) * 100, 1)

    # High school completion: % with HS diploma or higher
    ed_hs = parse_int(raw.get("B15003_017E")) or 0
    ed_ged = parse_int(raw.get("B15003_018E")) or 0
    ed_sc1 = parse_int(raw.get("B15003_019E")) or 0
    ed_sc2 = parse_int(raw.get("B15003_020E")) or 0
    ed_assoc = parse_int(raw.get("B15003_021E")) or 0
    pct_hs_completion = None
    if ed_total and ed_total > 0:
        hs_or_higher = ed_hs + ed_ged + ed_sc1 + ed_sc2 + ed_assoc + ed_bach + ed_mast + ed_prof + ed_doct
        pct_hs_completion = round((hs_or_higher / ed_total) * 100, 1)

    # Broadband: % with internet subscription
    inet_total = parse_int(raw.get("B28002_001E"))
    inet_sub = parse_int(raw.get("B28002_002E"))
    pct_broadband = None
    if inet_total and inet_total > 0 and inet_sub is not None:
        pct_broadband = round((inet_sub / inet_total) * 100, 1)

    # Uninsured rate (simplified from B27010)
    ins_total = parse_int(raw.get("B27010_001E"))
    no_ins_1 = parse_int(raw.get("B27010_017E")) or 0
    no_ins_2 = parse_int(raw.get("B27010_033E")) or 0
    no_ins_3 = parse_int(raw.get("B27010_050E")) or 0
    pct_uninsured = None
    if ins_total and ins_total > 0:
        pct_uninsured = round(((no_ins_1 + no_ins_2 + no_ins_3) / ins_total) * 100, 1)

    # Poverty rate: % below federal poverty line
    pov_total = parse_int(raw.get("B17001_001E"))
    pov_below = parse_int(raw.get("B17001_002E"))
    pct_poverty = None
    if pov_total and pov_total > 0 and pov_below is not None:
        pct_poverty = round((pov_below / pov_total) * 100, 1)

    # Employment rate: % employed among civilian labor force
    emp_labor = parse_int(raw.get("B23025_003E"))
    emp_employed = parse_int(raw.get("B23025_004E"))
    pct_employment = None
    if emp_labor and emp_labor > 0 and emp_employed is not None:
        pct_employment = round((emp_employed / emp_labor) * 100, 1)

    return {
        "median_income": median_income,
        "pct_bachelors": pct_bachelors,
        "pct_hs_completion": pct_hs_completion,
        "pct_broadband": pct_broadband,
        "pct_uninsured": pct_uninsured,
        "pct_poverty": pct_poverty,
        "pct_employment": pct_employment,
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch Census ACS data for HBCU schools")
    parser.add_argument("--key", required=True, help="Census API key")
    parser.add_argument("--input", default="data/hbcu_schools.json", help="Input JSON file")
    parser.add_argument("--output", default="data/hbcu_schools.json", help="Output JSON file")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, args.input)
    output_path = os.path.join(script_dir, args.output)

    with open(input_path, "r") as f:
        schools = json.load(f)

    print(f"Fetching Census ACS data for {len(schools)} schools...")
    print(f"API Key: {args.key[:8]}...\n")

    updated = 0
    for i, school in enumerate(schools):
        state_fips = school.get("fips_state")
        county_fips = school.get("fips_county")

        if not state_fips or not county_fips:
            print(f"  [{i+1}/{len(schools)}] {school['name']} — skipped (no FIPS codes)")
            continue

        print(f"  [{i+1}/{len(schools)}] {school['name']} ({state_fips}/{county_fips})...", end=" ")

        raw = fetch_county_data(state_fips, county_fips, args.key)
        metrics = compute_metrics(raw)

        if metrics:
            for key, val in metrics.items():
                if val is not None:
                    school[key] = val
            print("OK")
            updated += 1
        else:
            print("no data")

        # Rate limiting: Census API allows ~500 requests/day for unregistered, more with key
        time.sleep(0.3)

    with open(output_path, "w") as f:
        json.dump(schools, f, indent=2)

    print(f"\nDone! Updated {updated}/{len(schools)} schools.")
    print(f"Output saved to: {output_path}")
    print("\nNote: 'nearby_libraries' is not available from Census.")
    print("For library data, see IMLS: https://www.imls.gov/research-evaluation/data-collection/public-libraries-survey")


if __name__ == "__main__":
    main()
