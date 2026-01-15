# Claude Code Conversations Index

## Overview

This folder contains **87 conversation files** from the Claude Code development sessions.

**Location:** `youtube/claude_conversations/`

**Format:** JSONL (JSON Lines) - each line is a separate message/event

---

## How to Analyze These Files

### Quick Stats

```bash
# Count total messages across all conversations
cat claude_conversations/*.jsonl | wc -l

# Find largest conversations (most activity)
ls -lhS claude_conversations/*.jsonl | head -20

# Search for specific prompts
grep -l "create.*table" claude_conversations/*.jsonl
```

### Using Python to Extract Prompts

```python
import json
import os
from pathlib import Path

def extract_user_prompts(folder_path):
    """Extract all user prompts from conversation files."""
    prompts = []

    for file in Path(folder_path).glob("*.jsonl"):
        with open(file, 'r') as f:
            for line in f:
                try:
                    msg = json.loads(line)
                    # Look for user messages
                    if msg.get('type') == 'human' or msg.get('role') == 'user':
                        content = msg.get('content', msg.get('message', ''))
                        if content and len(content) > 10:
                            prompts.append({
                                'file': file.name,
                                'prompt': content[:500],  # First 500 chars
                                'length': len(content)
                            })
                except:
                    pass

    return prompts

# Usage
prompts = extract_user_prompts('claude_conversations')
for p in sorted(prompts, key=lambda x: x['length'], reverse=True)[:20]:
    print(f"\n{'='*60}")
    print(f"File: {p['file']}")
    print(f"Length: {p['length']}")
    print(f"Prompt: {p['prompt'][:200]}...")
```

### Using jq (Command Line)

```bash
# Extract all human messages
cat claude_conversations/*.jsonl | jq -r 'select(.type == "human") | .content' 2>/dev/null

# Find tool calls
cat claude_conversations/*.jsonl | jq -r 'select(.tool_calls) | .tool_calls[].name' 2>/dev/null | sort | uniq -c | sort -rn

# Find file operations
grep -h "Write\|Edit\|Read" claude_conversations/*.jsonl | head -50
```

---

## Key Conversation Files (By Size)

| File | Size | Likely Content |
|------|------|----------------|
| `3b2bd61d-*.jsonl` | ~42 MB | Major development session |
| `ae35cd04-*.jsonl` | ~24 MB | Large feature implementation |
| `b89e905c-*.jsonl` | ~21 MB | Significant coding session |
| `dea637e3-*.jsonl` | ~11 MB | Medium development session |
| `6307834c-*.jsonl` | ~21 MB | Feature development |
| `20d7e666-*.jsonl` | ~8 MB | Development session |

---

## What to Look For (YouTube Content Ideas)

### 1. **Key Architectural Decisions**
Search for prompts about:
- "create table" / "database schema"
- "how should we structure"
- "design" / "architecture"

### 2. **Problem Solving Moments**
Search for:
- "error" / "fix" / "bug"
- "doesn't work" / "failed"
- "why is" / "how do I"

### 3. **Feature Implementation**
Search for:
- "add feature"
- "implement"
- "create endpoint"

### 4. **Automation Setup**
Search for:
- "n8n" / "zapier"
- "deploy" / "vercel"
- "API key" / "authentication"

### 5. **MCP Usage**
Search for:
- "mcp__supabase"
- "mcp__vercel"
- "mcp__chrome"

---

## Sample Extraction Script

Save this as `extract_highlights.py`:

```python
#!/usr/bin/env python3
"""Extract highlight prompts from Claude Code conversations."""

import json
import os
from pathlib import Path
from collections import defaultdict

def analyze_conversations(folder):
    stats = {
        'total_files': 0,
        'total_messages': 0,
        'user_prompts': [],
        'tool_calls': defaultdict(int),
        'files_touched': set(),
        'errors_encountered': [],
    }

    for file in Path(folder).glob("*.jsonl"):
        stats['total_files'] += 1

        with open(file, 'r') as f:
            for line in f:
                stats['total_messages'] += 1
                try:
                    msg = json.loads(line)

                    # User prompts
                    if msg.get('type') == 'human':
                        content = msg.get('content', '')
                        if len(content) > 20:
                            stats['user_prompts'].append({
                                'file': file.name,
                                'content': content,
                                'length': len(content)
                            })

                    # Tool calls
                    if 'tool_calls' in msg:
                        for tc in msg['tool_calls']:
                            stats['tool_calls'][tc.get('name', 'unknown')] += 1

                    # Files touched
                    if 'file_path' in str(msg):
                        # Extract file paths
                        import re
                        paths = re.findall(r'/[^\s"\']+\.(py|tsx?|md|json)', str(msg))
                        stats['files_touched'].update(paths)

                    # Errors
                    if 'error' in str(msg).lower():
                        stats['errors_encountered'].append(str(msg)[:200])

                except json.JSONDecodeError:
                    pass

    return stats

def print_report(stats):
    print("=" * 60)
    print("CLAUDE CODE CONVERSATION ANALYSIS")
    print("=" * 60)

    print(f"\nTotal Files: {stats['total_files']}")
    print(f"Total Messages: {stats['total_messages']}")
    print(f"User Prompts: {len(stats['user_prompts'])}")
    print(f"Files Touched: {len(stats['files_touched'])}")

    print("\n" + "=" * 60)
    print("TOP 20 LONGEST PROMPTS (Best for YouTube)")
    print("=" * 60)

    for p in sorted(stats['user_prompts'], key=lambda x: x['length'], reverse=True)[:20]:
        print(f"\n--- {p['file']} ({p['length']} chars) ---")
        print(p['content'][:300] + "..." if len(p['content']) > 300 else p['content'])

    print("\n" + "=" * 60)
    print("MOST USED TOOLS")
    print("=" * 60)

    for tool, count in sorted(stats['tool_calls'].items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f"  {tool}: {count}")

if __name__ == "__main__":
    stats = analyze_conversations("claude_conversations")
    print_report(stats)
```

---

## Quick Reference: Message Types in JSONL

```json
// User message
{"type": "human", "content": "Create a new table for..."}

// Assistant response
{"type": "assistant", "content": "I'll create that table..."}

// Tool call
{"tool_calls": [{"name": "mcp__supabase__execute_sql", "arguments": {...}}]}

// Tool result
{"type": "tool_result", "content": "Query executed successfully"}
```

---

## Recommended Analysis Flow

1. **Run the extraction script** to get top prompts
2. **Sort by length** - longer prompts usually = more context
3. **Look for patterns** - repeated themes, common issues
4. **Find "aha moments"** - where a bug was fixed or feature clicked
5. **Extract MCP examples** - show real Supabase/Vercel commands

---

*Created for YouTube video production - NotebookLM Reimagined*
