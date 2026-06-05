import json
import re

transcript_path = '/Users/hasan/.gemini/antigravity-ide/brain/62cfb179-485b-4a7f-9e58-f96c42e06f3f/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        
        # Let's search for keys containing our text
        for k in ['content', 'output']:
            val = str(data.get(k, ''))
            if 'Showing lines 801 to 1261' in val or 'Showing lines 1 to 800' in val or 'Showing lines 666 to 1027' in val:
                print(f"Found key '{k}' in step {data.get('step_index')} (source={data.get('source')}, type={data.get('type')})")
                
                # Extract clean lines
                lines = val.split('\\n') if '\\n' in val else val.split('\n')
                cleaned_lines = []
                for l in lines:
                    match = re.match(r'^\s*(\d+):\s*(.*)', l)
                    if match:
                        cleaned_lines.append(match.group(2))
                    else:
                        if not any(x in l for x in ['Showing lines', 'File Path:', 'Total Lines:', 'Created At:', 'Completed At:']):
                            cleaned_lines.append(l)
                
                # Write to file
                output_name = f"reconstructed_{data.get('step_index')}.tsx"
                with open(output_name, 'w') as out:
                    out.write('\n'.join(cleaned_lines))
                print(f"Saved to {output_name}")
