import json

map_path = ".next/server/chunks/ssr/src_app_dashboard_page_tsx_04esg22._.js.map"
with open(map_path, "r") as f:
    data = json.load(f)

sources = data.get("sources", [])
print(f"Total sources in map: {len(sources)}")

parent_dashboard_idx = -1
for idx, src in enumerate(sources):
    if "parent-dashboard.tsx" in src:
        print(f"Found parent-dashboard.tsx at source index {idx}: {src}")
        parent_dashboard_idx = idx
        break

if parent_dashboard_idx != -1:
    contents = data.get("sourcesContent", [])
    if parent_dashboard_idx < len(contents):
        content = contents[parent_dashboard_idx]
        print("Successfully recovered parent-dashboard.tsx contents!")
        with open("parent_dashboard_recovered.tsx", "w") as out:
            out.write(content)
        print("Saved to parent_dashboard_recovered.tsx")
    else:
        print("Error: index out of range for sourcesContent.")
else:
    print("parent-dashboard.tsx not found in sources.")
