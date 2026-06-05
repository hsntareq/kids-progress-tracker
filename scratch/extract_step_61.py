import json

transcript_path = '/Users/hasan/.gemini/antigravity-ide/brain/62cfb179-485b-4a7f-9e58-f96c42e06f3f/.system_generated/logs/transcript.jsonl'
output_path = '/Users/hasan/WorkStation/kids-progress-tracker/scratch/step_61_output.json'

with open(transcript_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        if data.get('step_index') == 61:
            with open(output_path, 'w') as out_f:
                json.dump(data, out_f, indent=2)
            print("Step 61 written to", output_path)
            break
