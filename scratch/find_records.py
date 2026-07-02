import requests
import json
import base64

servers = [
    {
        "name": "Dev Server",
        "url": "https://hmis-tests.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    },
    {
        "name": "Test Server",
        "url": "https://hmis-tests.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH" # mccod.test:Dhis2@2025 in base64
    },
    {
        "name": "Prod Server",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic aGlzcC5za3VudW5rYTpBaWNvbm5lY3RAMTIzJA==" # hisp.skununka from env.development
    },
    {
        "name": "Prod Server (Alternative)",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    }
]

inpatient_numbers = ["1779", "1783", "1669"]
program = "vf8dN49jprI"

def check_server(server):
    print(f"\n=== Checking {server['name']} ({server['url']}) ===")
    headers = {
        "Authorization": server["auth_header"],
        "Accept": "application/json"
    }
    
    # 1. Resolve Buwenge General Hospital orgUnit ID
    org_unit_id = None
    try:
        org_url = f"{server['url']}/api/organisationUnits?filter=displayName:ilike:Buwenge&fields=id,displayName"
        res = requests.get(org_url, headers=headers, timeout=15)
        if res.status_code == 200:
            units = res.json().get("organisationUnits", [])
            print(f"Found org units matching 'Buwenge': {units}")
            for u in units:
                if "Buwenge General Hospital" in u["displayName"]:
                    org_unit_id = u["id"]
                    print(f"Selecting {u['displayName']} ({org_unit_id})")
                    break
            if not org_unit_id and units:
                org_unit_id = units[0]["id"]
                print(f"Falling back to first match: {units[0]['displayName']} ({org_unit_id})")
        else:
            print(f"Failed to query org units. Status code: {res.status_code}")
    except Exception as e:
        print(f"Error querying org units: {e}")
        
    if not org_unit_id:
        print("Could not resolve Buwenge General Hospital orgUnit ID. Using default 'h40pKp93Mtc'")
        org_unit_id = "h40pKp93Mtc"

    # Let's try querying events
    # We will search by filtering on case number/inpatient number data elements,
    # or by retrieving all events for the orgUnit and searching locally.
    
    # Let's retrieve all events for this program and org unit (paging=false or limit to 1000)
    # We'll also try a direct search query filter to see if it supports filtering.
    
    # Let's try to query events directly with filter
    # Data elements: ZKBE8Xm9DJG (case number), FGagV1Utrdh (inpatient number)
    try:
        events_url = f"{server['url']}/api/events.json?program={program}&orgUnit={org_unit_id}&ouMode=DESCENDANTS&paging=false"
        print(f"Fetching events from {events_url}...")
        res = requests.get(events_url, headers=headers, timeout=30)
        if res.status_code == 200:
            events_data = res.json()
            events = events_data.get("events", [])
            print(f"Retrieved {len(events)} events.")
            
            # Let's search inside events for the inpatient numbers
            matches = []
            for ev in events:
                event_id = ev.get("event")
                event_date = ev.get("eventDate")
                org_unit_name = ev.get("orgUnitName", "")
                
                # Check dataValues
                dvs = ev.get("dataValues", [])
                for dv in dvs:
                    de = dv.get("dataElement")
                    val = dv.get("value")
                    
                    for num in inpatient_numbers:
                        # Direct match, or match within a string (e.g. "EMR-CASE-1779")
                        if num in str(val):
                            matches.append({
                                "event": event_id,
                                "eventDate": event_date,
                                "orgUnit": ev.get("orgUnit"),
                                "orgUnitName": org_unit_name,
                                "dataElement": de,
                                "value": val,
                                "searched_num": num,
                                "full_event": ev
                            })
            
            if matches:
                print(f"FOUND {len(matches)} MATCHING EVENTS:")
                for m in matches:
                    print(f" - Match for Inpatient Num {m['searched_num']}:")
                    print(f"   Event ID: {m['event']}, Date: {m['eventDate']}, OrgUnit: {m['orgUnitName']} ({m['orgUnit']})")
                    print(f"   DataElement: {m['dataElement']}, Value: '{m['value']}'")
            else:
                print(f"No events matching {inpatient_numbers} found in the retrieved {len(events)} events.")
                
        else:
            print(f"Failed to query events. Status code: {res.status_code}")
            # Try /api/30/events or similar if needed
            print(res.text[:300])
    except Exception as e:
        print(f"Error querying events: {e}")

if __name__ == "__main__":
    for s in servers:
        check_server(s)
