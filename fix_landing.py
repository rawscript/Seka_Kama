with open('web-app/seka_kama/components/LandingPage.tsx', encoding='utf-8') as f:
    src = f.read()

old = '        console.error("Failed to load initial stats:", error);'
new = '        // Warn rather than error — expected when the backend is not yet running locally.\n        console.warn("Failed to load initial stats:", error);'

if old in src:
    src = src.replace(old, new, 1)
    with open('web-app/seka_kama/components/LandingPage.tsx', 'w', encoding='utf-8') as f:
        f.write(src)
    print('Done: replaced console.error with console.warn')
else:
    print('Pattern not found — dumping matching lines:')
    for i, line in enumerate(src.splitlines(), 1):
        if 'console.error' in line:
            print(f'  Line {i}: {repr(line)}')
