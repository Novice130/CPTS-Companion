import json

def check_mindmaps():
    try:
        with open('seed/modules.json', 'r', encoding='utf-8') as f:
            modules = json.load(f)
        
        with open('seed/mindmaps.json', 'r', encoding='utf-8') as f:
            mindmaps = json.load(f)
            
        mindmap_module_ids = set()
        for mm in mindmaps:
            if mm.get('module_id') is not None:
                mindmap_module_ids.add(mm['module_id'])
                
        print(f"Total Modules: {len(modules)}")
        print(f"Total Mindmaps: {len(mindmaps)}")
        
        missing_modules = []
        for i, module in enumerate(modules, 1):
            if i not in mindmap_module_ids:
                missing_modules.append(f"ID {i}: {module['title']}")
                
        if missing_modules:
            print("\nModules missing mindmaps:")
            for m in missing_modules:
                print(m)
        else:
            print("\nAll modules have at least one mindmap.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_mindmaps()
