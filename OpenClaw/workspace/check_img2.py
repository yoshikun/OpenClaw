import re, sys
filepath = r'C:\Users\yyzypublic\.openclaw\media\inbound\6cebef06-e2c9-43c9-b3db-08057050caf5.jpg'
with open(filepath, 'rb') as f:
    data = f.read()
# Look for specific patterns
patterns = [
    (b'github', 'github'),
    (b'ghp_', 'ghp_token'),
    (b'gho_', 'gho_token'),
    (b'github_pat', 'fine_grained_pat'),
    (b'OpenClaw', 'openclaw'),
    (b'yoshikun', 'yoshikun'),
    (b'repo', 'repo'),
    (b'http', 'http_url'),
    (b'token', 'token'),
    (b'Token', 'token_cap'),
]
for pat, name in patterns:
    idx = data.find(pat)
    if idx >= 0:
        context = data[max(0,idx-20):idx+80]
        print(f'Found "{name}" at offset {idx}:')
        try:
            printable = ''.join(chr(b) if 32 <= b < 127 else '.' for b in context)
            print(f'  {printable}')
        except:
            print(f'  {context}')
        print()

# Also find any long alphanumeric strings (potential tokens)
long_strings = re.findall(rb'[A-Za-z0-9_-]{30,}', data)
for s in long_strings:
    try:
        print(f'Long string ({len(s)} chars): {s.decode("ascii")[:100]}')
    except:
        pass
