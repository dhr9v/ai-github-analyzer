import os
import ast
from typing import Dict, Any, List
from radon.visitors import ComplexityVisitor
from radon.metrics import mi_visit, h_visit

class ComplexityService:
    @staticmethod
    def analyze_repository(repo_dir: str) -> Dict[str, Any]:
        """
        Calculates Cyclomatic Complexity, Maintainability Index, and Halstead 
        Metrics of Python files in the repository.
        """
        file_metrics = []
        total_cc = 0
        total_mi = 0
        total_volume = 0
        total_difficulty = 0
        total_bugs = 0
        
        file_count = 0
        function_count = 0
        complex_items = []
        
        mi_distribution = {"A": 0, "B": 0, "C": 0}
        
        for root, _, files in os.walk(repo_dir):
            # Skip common non-source/virtual directories
            if any(p in root for p in [".git", "node_modules", "venv", ".venv", "__pycache__"]):
                continue
            
            for f in files:
                if not f.endswith(".py"):
                    continue
                    
                file_path = os.path.join(root, f)
                # Compute path relative to repo root
                rel_path = os.path.relpath(file_path, repo_dir).replace("\\", "/")
                
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as file_read:
                        code = file_read.read()
                    
                    if not code.strip():
                        continue
                        
                    # Calculate Cyclomatic Complexity via Radon
                    cc_visitor = ComplexityVisitor.from_code(code)
                    functions_and_classes = []
                    
                    # Radon splits functions and classes
                    for func in cc_visitor.functions:
                        functions_and_classes.append({
                            "name": func.name,
                            "type": "function",
                            "complexity": func.complexity,
                            "lineno": func.lineno
                        })
                        total_cc += func.complexity
                        function_count += 1
                        
                    for cls in cc_visitor.classes:
                        functions_and_classes.append({
                            "name": cls.name,
                            "type": "class",
                            "complexity": cls.real_complexity,
                            "lineno": cls.lineno
                        })
                        total_cc += cls.real_complexity
                        function_count += 1
                        
                    # Catalog complex functions/methods (threshold > 5)
                    for item in functions_and_classes:
                        if item["complexity"] > 5:
                            complex_items.append({
                                "file": rel_path,
                                "name": item["name"],
                                "type": item["type"],
                                "complexity": item["complexity"],
                                "lineno": item["lineno"]
                            })
                            
                    # Calculate Maintainability Index
                    mi = mi_visit(code, multi=True)
                    total_mi += mi
                    if mi >= 80:
                        mi_distribution["A"] += 1
                    elif mi >= 50:
                        mi_distribution["B"] += 1
                    else:
                        mi_distribution["C"] += 1
                        
                    # Calculate Halstead metrics
                    try:
                        h_metrics = h_visit(code)
                        total_volume += h_metrics.total.volume
                        total_difficulty += h_metrics.total.difficulty
                        total_bugs += h_metrics.total.bugs
                    except Exception:
                        pass
                        
                    file_count += 1
                    file_metrics.append({
                        "file_path": rel_path,
                        "mi": round(mi, 2),
                        "cc_average": round(cc_visitor.complexity, 2) if cc_visitor.complexity else 0,
                        "loc": len(code.splitlines())
                    })
                except Exception:
                    pass
                    
        # Sort complex items to extract top 10 bottlenecks
        complex_items = sorted(complex_items, key=lambda x: x["complexity"], reverse=True)[:10]
        
        avg_cc = round(total_cc / max(function_count, 1), 2)
        avg_mi = round(total_mi / max(file_count, 1), 2)
        
        return {
            "average_cyclomatic_complexity": avg_cc,
            "average_maintainability_index": avg_mi,
            "total_halstead_volume": round(total_volume, 2),
            "total_halstead_difficulty": round(total_difficulty, 2),
            "total_halstead_bugs": round(total_bugs, 2),
            "file_count": file_count,
            "function_count": function_count,
            "mi_distribution": mi_distribution,
            "most_complex_methods": complex_items,
            "file_metrics": file_metrics
        }
