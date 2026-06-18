import struct, re
filepath = r'C:\Users\yyzypublic\.openclaw\media\inbound\6cebef06-e2c9-43c9-b3db-08057050caf5.jpg'
with open(filepath, 'rb') as f:
    data = f.read()
print(f'File size: {len(data)} bytes')
print(f'JPEG header: {data[0:2] == b"\xff\xd8"}')
# readable strings
strings = re.findall(rb'[\x20-\x7e]{4,}', data)
for s in strings[:50]:
    try:
        print(s.decode('ascii'))
    except:
        pass
