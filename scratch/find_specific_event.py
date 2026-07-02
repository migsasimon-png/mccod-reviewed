import requests
import json

servers = [
    {
        "name": "Dev Server",
        "url": "https://hmis-tests.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    },
    {
        "name": "Test Server",
        "url": "https://hmis-tests.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    },
    {
        "name": "Prod Server",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic aGlzcC5za3VudW5rYTpBaWNvbm5lY3RAMTIzJA=="
    },
    {
        "name": "Prod Server (Alternative)",
        "url": "https://hmis.health.go.ug",
        "auth_header": "Basic d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH"
    }
]

search_value = "UG-NWX-447"
program = "vf8dN49jprI"
filters = ["FGagV1Utrdh", "ZKBE8Xm9DJG"]

def find_event():
    for server in servers:
        print(f"\n=== Searching on {server['name']} ({server['url']}) ===")
        headers = {
            "Authorization": server["auth_header"],
            "Accept": "application/json"
        }
        
        for de_filter in filters:
            url = f"{server['url']}/api/events.json?program={program}&filter={de_filter}:eq:{search_value}&ouMode=ALL&paging=false"
            print(f"Querying: filter={de_filter}:eq:{search_value}...")
            try:
                res = requests.get(url, headers=headers, timeout=20)
                if res.status_code == 200:
                    events = res.json().get("events", [])
                    if events:
                        print(f"FOUND {len(events)} matches under data element {de_filter} on {server['name']}!")
                        for ev in events:
                            print(f"Event ID: {ev.get('event')}, OrgUnit: {ev.get('orgUnitName')}, EventDate: {ev.get('eventDate')}")
                    else:
                        print("No match.")
                else:
                    print(f"Status: {res.status_code}")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    find_event()
