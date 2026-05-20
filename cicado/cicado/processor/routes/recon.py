
from flask import Blueprint, request, jsonify
import sys
import os
import importlib

recon_bp = Blueprint('recon', __name__)

# Add the recon directories to python path so modules can be imported
RECON_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'recon'))
DEEP_RECON_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'recon', 'deep'))

if RECON_DIR not in sys.path:
    sys.path.append(RECON_DIR)
if DEEP_RECON_DIR not in sys.path:
    sys.path.append(DEEP_RECON_DIR)

def run_module(module_name, domain, deep=False):
    try:
        if deep:
            # We assume it's in recon/deep/
            sys.path.insert(0, DEEP_RECON_DIR)
            mod = importlib.import_module(module_name)
            sys.path.pop(0)
        else:
            sys.path.insert(0, RECON_DIR)
            mod = importlib.import_module(module_name)
            sys.path.pop(0)
        
        if hasattr(mod, 'process'):
            return mod.process(domain)
        return {"error": "Module does not have process() function"}
    except Exception as e:
        return {"error": str(e)}

@recon_bp.route('/<module_name>', methods=['POST'])
def run_recon(module_name):
    data = request.json
    domain = data.get('domain')
    deep = data.get('deep', False)
    
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400
        
    result = run_module(module_name, domain, deep)
    return jsonify({module_name: result})
