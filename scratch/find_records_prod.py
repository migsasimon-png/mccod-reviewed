import requests
import json
import base64

# Production server connection credentials from env files
prod_credentials = [
    {
        "name": "Production Server (hisp.skununka)",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic aGlzcC5za3VudW5rYTpBaWNvbm5lY3RAMTIzJA=="
    },
    {
        "name": "Production Server (hisp.colupot)",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    }
]

inpatient_numbers = ["1779", "1783", "1669"]
program = "vf8dN49jprI" # MCCoD program

def check_prod():
    # We will try the credentials until one works
    for cred in prod_credentials:
        print(f"\n--- Trying production credentials: {cred['name']} ---")
        headers = {
            "Authorization": cred["auth_header"],
            "Accept": "application/json"
        }
        
        # 1. First get org unit for Buwenge General Hospital
        org_unit_id = None
        org_unit_name = None
        try:
            org_url = f"{cred['url']}/api/organisationUnits?filter=displayName:ilike:Buwenge&fields=id,displayName"
            print(f"GET: {org_url.replace(cred['auth_header'], '[REDACTED]')}")
            res = requests.get(org_url, headers=headers, timeout=15)
            if res.status_code == 200:
                units = res.json().get("organisationUnits", [])
                print(f"Found org units: {units}")
                for u in units:
                    if "Buwenge" in u["displayName"]:
                        org_unit_id = u["id"]
                        org_unit_name = u["displayName"]
                        break
            else:
                print(f"Auth failed or endpoint error: Status {res.status_code}")
                continue
        except Exception as e:
            print(f"Error querying org unit: {e}")
            continue
            
        if not org_unit_id:
            print("Buwenge org unit not found. Trying default ID: h40pKp93Mtc")
            org_unit_id = "h40pKp93Mtc"
            org_unit_name = "Buwenge General Hospital (Default ID)"
            
        # 2. Query events in MCCoD program for Buwenge General Hospital org unit
        try:
            # Query with filters to find the specific inpatient/case numbers in the relevant data elements:
            # ZKBE8Xm9DJG is Case Number / Inpatient Number
            # FGagV1Utrdh is also mapped to Inpatient Number in mcodmap
            
            # Let's request all events for Buwenge and search locally to ensure we don't miss anything due to API filter syntax
            events_url = f"{cred['url']}/api/events.json?program={program}&orgUnit={org_unit_id}&ouMode=DESCENDANTS&paging=false"
            print(f"GET: {events_url}")
            res = requests.get(events_url, headers=headers, timeout=30)
            
            if res.status_code == 200:
                events_data = res.json()
                events = events_data.get("events", [])
                print(f"Successfully retrieved {len(events)} events for {org_unit_name}.")
                
                # Search the events for our numbers
                matches = []
                for ev in events:
                    event_id = ev.get("event")
                    event_date = ev.get("eventDate")
                    dvs = ev.get("dataValues", [])
                    
                    # Store any match info
                    for dv in dvs:
                        de = dv.get("dataElement")
                        val = str(dv.get("value", ""))
                        
                        for num in inpatient_numbers:
                            # Match if the value is exactly the number, or contains it (e.g. "1779" or "EMR-CASE-1779")
                            if num == val or f"CASE-{num}" in val or f"case-{num}" in val or val.endswith(num):
                                matches.append({
                                    "searched_num": num,
                                    "event_id": event_id,
                                    "event_date": event_date,
                                    "data_element": de,
                                    "matched_value": val,
                                    "event_details": ev
                                })
                
                if matches:
                    print(f"\n*** SUCCESS: FOUND {len(matches)} MATCHING RECORDS ON PRODUCTION ***")
                    for m in matches:
                        print(f"Inpatient ID / Case ID searched: {m['searched_num']}")
                        print(f"  Event ID: {m['event_id']}")
                        print(f"  Event Date: {m['event_date']}")
                        print(f"  Data Element ID: {m['data_element']}")
                        print(f"  Value on server: '{m['matched_value']}'")
                        # Format and print some details of the event
                        patient_name = ""
                        for dv in m['event_details'].get('dataValues', []):
                            # ZYKmQ9GPOaF is Full Name, QmcOqkcNTip is Given Name, Q7VM7swIWb6 is Surname
                            if dv.get('dataElement') == 'ZYKmQ9GPOaF':
                                patient_name = dv.get('value')
                        print(f"  Patient Name found: {patient_name}")
                        print("-" * 40)
                    
                    # Save results to a file
                    output_file = "c:\\Users\\SK\\Documents\\Paul Mbaka hmis 100\\health-app\\scratch\\found_records_prod.json"
                    with open(output_file, "w") as f:
                        json.dump(matches, f, indent=4)
                    print(f"Detailed matches written to: {output_file}")
                    return
                else:
                    print(f"No records containing {inpatient_numbers} were found in the {len(events)} events for {org_unit_name}.")
            else:
                print(f"Failed to query events. Status code: {res.status_code}")
                print(res.text[:300])
        except Exception as e:
            print(f"Error querying events: {e}")

if __name__ == "__main__":
    check_prod()
