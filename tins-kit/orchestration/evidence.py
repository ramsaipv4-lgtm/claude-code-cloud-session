# Extract failing commands from a builder transcript (JSONL) as evidence for the build journal.
import json,sys,re
path=sys.argv[1]; out=[]
uses={}
for line in open(path):
    try: e=json.loads(line)
    except: continue
    m=e.get('message',{}); c=m.get('content')
    if not isinstance(c,list): continue
    for it in c:
        if it.get('type')=='tool_use':
            uses[it['id']]=it
            blob=json.dumps(it.get('input',{}))
            # rule audit: reading hidden acceptance tests (anything but smoke/ and fixtures/) is a violation
            inp=it.get('input',{}) or {}
            hidden=r'acceptance/(core|api|adapters|journeys|perf|games)(/|\b)'
            target=' '.join(str(inp.get(k,'')) for k in ('file_path','path','pattern') if k!='pattern' or it.get('name')=='Glob')
            cmd=str(inp.get('command',''))
            viol = (it.get('name') in ('Read','Grep','Glob') and re.search(hidden,target)) or                    re.search(r'(^|[;&|(]\s*)(cat|grep|sed|head|tail|less|awk|rg)\b[^;&|]*'+hidden, cmd)
            if viol:
                out.append(('RULE: read a hidden acceptance test (SPEC D-40)', json.dumps(inp)[:600]))
        if it.get('type')=='tool_result':
            txt=it.get('content')
            if isinstance(txt,list): txt=' '.join(x.get('text','') for x in txt if isinstance(x,dict))
            txt=str(txt)
            bad = it.get('is_error') or re.search(r'(^|\n)\s*not ok |# fail [1-9]|gate: FAIL|Error:|ERR_|exit code [1-9]|SyntaxError|TypeError|AssertionError|No such file or directory',txt,re.I)
            if bad:
                u=uses.get(it.get('tool_use_id'),{})
                cmd=u.get('input',{}).get('command') or u.get('input',{}).get('file_path') or u.get('name')
                out.append((str(cmd)[:200], txt[:900]))
for i,(c,t) in enumerate(out,1):
    print(f"### E{i}. `{c}`\n```text\n{t.strip()}\n```\n")
print(f"<!-- {len(out)} failing tool results -->")
