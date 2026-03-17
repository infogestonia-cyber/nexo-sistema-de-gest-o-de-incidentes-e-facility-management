import os
import glob

replacements = {
    "bg-brand-surface": "bg-card",
    "border-brand-border": "border-border",
    "text-brand-text-primary": "text-foreground",
    "text-brand-text-secondary": "text-muted-foreground",
    "bg-brand-bg": "bg-background",
    "text-emerald-500": "text-primary",
    "bg-emerald-500": "bg-primary",
    "border-emerald-500": "border-primary",
    "shadow-emerald-500": "shadow-primary",
    "ring-emerald-500": "ring-primary",
    "text-emerald-400": "text-primary/80",
    "bg-emerald-400": "bg-primary/80",
    "text-emerald-100": "text-primary-foreground",
    "text-emerald-600": "text-primary",
    "hover:bg-emerald-600": "hover:bg-primary/90",
    "hover:bg-emerald-500": "hover:bg-primary/90",
    "hover:text-emerald-500": "hover:text-primary",
    "hover:border-emerald-500": "hover:border-primary",
    "focus:ring-emerald-500": "focus:ring-primary",
    "rounded-none": "rounded-md", # shadcn NY theme utilizes radius 0.5rem (md) generally. We'll change rounded-none to rounded-md
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filepath in glob.glob('src/**/*.tsx', recursive=True):
    process_file(filepath)
for filepath in glob.glob('src/**/*.ts', recursive=True):
    process_file(filepath)
