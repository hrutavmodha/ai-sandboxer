#!/usr/bin/env python3
import json
import sys
import os

def validate():
    path = 'tasks.json'
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        sys.exit(1)

    try:
        with open(path, 'r') as f:
            data = json.load(f)
        
        errors = []
        
        for field in ['name', 'description', 'techStacks', 'roadmap']:
            if field not in data:
                errors.append(f"Missing required project field: '{field}'")
        
        if not errors:
            if not isinstance(data.get('techStacks'), list):
                errors.append("Field 'techStacks' must be a list.")
            if not isinstance(data.get('roadmap'), list):
                errors.append("Field 'roadmap' must be a list.")

        if not errors:
            roadmap = data['roadmap']
            for p_idx, phase in enumerate(roadmap):
                for p_field in ['id', 'description', 'tasks']:
                    if p_field not in phase:
                        errors.append(f"Phase {p_idx} missing field: '{p_field}'")
                
                if 'tasks' in phase:
                    tasks = phase['tasks']
                    if not isinstance(tasks, list):
                        errors.append(f"Phase {p_idx} 'tasks' must be a list.")
                    else:
                        for t_idx, task in enumerate(tasks):
                            for t_field in ['id', 'description', 'details', 'completed']:
                                if t_field not in task:
                                    errors.append(f"Task {t_idx} in Phase {p_idx} missing field: '{t_field}'")
                            
                            if 'id' in task and not isinstance(task['id'], int):
                                errors.append(f"Task {t_idx} in Phase {p_idx} 'id' must be an int.")
                            if 'description' in task and not isinstance(task['description'], str):
                                errors.append(f"Task {t_idx} in Phase {p_idx} 'description' must be a string.")
                            if 'details' in task and not isinstance(task['details'], list):
                                errors.append(f"Task {t_idx} in Phase {p_idx} 'details' must be a list.")
                            if 'completed' in task and not isinstance(task['completed'], bool):
                                errors.append(f"Task {t_idx} in Phase {p_idx} 'completed' must be a boolean.")

        if 'bugs' in data:
            bugs = data['bugs']
            if not isinstance(bugs, list):
                errors.append("Field 'bugs' must be a list.")
            else:
                for b_idx, bug in enumerate(bugs):
                    for b_field in ['id', 'description', 'details', 'suggestedSolution', 'fixed']:
                        if b_field not in bug:
                            errors.append(f"Bug {b_idx} missing field: '{b_field}'")
                    
                    if 'id' in bug and not isinstance(bug['id'], int):
                        errors.append(f"Bug {b_idx} 'id' must be an int.")
                    if 'description' in bug and not isinstance(bug['description'], str):
                        errors.append(f"Bug {b_idx} 'description' must be a string.")
                    if 'details' in bug and not isinstance(bug['details'], list):
                        errors.append(f"Bug {b_idx} 'details' must be a list.")
                    if 'suggestedSolution' in bug and not isinstance(bug['suggestedSolution'], str):
                        errors.append(f"Bug {b_idx} 'suggestedSolution' must be a string.")
                    if 'fixed' in bug and not isinstance(bug['fixed'], bool):
                        errors.append(f"Bug {b_idx} 'fixed' must be a boolean.")

        if errors:
            print("Schema Validation Failed:")
            for err in errors:
                print(f" - {err}")
            sys.exit(1)

        print("tasks.json verified successfully.")
        sys.exit(0)
    except json.JSONDecodeError as e:
        print(f"Failed to parse tasks.json: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during validation: {e}")
        sys.exit(1)

if __name__ == '__main__':
    validate()
