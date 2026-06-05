import json

with open('/Users/hasan/WorkStation/kids-progress-tracker/scratch/step_61_output.json') as f:
    d = json.load(f)

calls = d.get('tool_calls', [])
for i, call in enumerate(calls):
    print(f"Call {i}: name={call.get('name')}")
    args = call.get('args', {})
    if isinstance(args, str):
        args = json.loads(args, strict=False)
    chunks = args.get('ReplacementChunks', [])
    if isinstance(chunks, str):
        chunks = json.loads(chunks, strict=False)
    print(f"Number of chunks: {len(chunks)}")
    for j, chunk in enumerate(chunks):
        print(f"  Chunk {j}: StartLine={chunk.get('StartLine')}, EndLine={chunk.get('EndLine')}")
        print(f"    TargetContent snippet: {repr(chunk.get('TargetContent', '')[:100])}")
        print(f"    ReplacementContent snippet: {repr(chunk.get('ReplacementContent', '')[:100])}")
        
        # Write each replacement chunk to a separate file so we can view it easily
        out_name = f"/Users/hasan/WorkStation/kids-progress-tracker/scratch/chunk_{i}_{j}.txt"
        with open(out_name, 'w') as out_f:
            out_f.write(chunk.get('ReplacementContent', ''))
        print(f"    Wrote chunk to {out_name}")
