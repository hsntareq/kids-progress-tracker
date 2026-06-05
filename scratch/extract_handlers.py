import re

chunk_path = ".next/dev/static/chunks/src_0e8~cti._.js"
with open(chunk_path, "r") as f:
    content = f.read()

# Let's search for keywords to find where functions are defined
keywords = ["handleAssignTask", "handleUpdateTakaRate", "handleCompleteTask", "handleSuggestTask", "handleCreateFamily", "handleApprove"]

for keyword in keywords:
    matches = [m.start() for m in re.finditer(keyword, content)]
    print(f"Keyword '{keyword}' matches: {len(matches)} times")
    for idx, start_idx in enumerate(matches):
        # Print surrounding context (e.g. 500 characters before and 1500 characters after)
        start = max(0, start_idx - 500)
        end = min(len(content), start_idx + 2500)
        print(f"--- Match {idx} for {keyword} (around index {start_idx}) ---")
        print(content[start:end])
        print("="*80)
