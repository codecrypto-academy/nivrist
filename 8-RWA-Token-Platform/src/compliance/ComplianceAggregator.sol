// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ICompliance } from "../interfaces/ICompliance.sol";

/// @title ComplianceAggregator — compliance modular (estilo ERC-3643 ModularCompliance)
/// @notice Es en sí mismo un `ICompliance` que agrega N módulos. `canTransfer` pasa solo si
///         TODOS los módulos aprueban; los hooks se propagan a cada módulo. El token usa este
///         agregador como su único punto de compliance.
/// @dev Cada módulo debe autorizar a este agregador como su caller de estado (los módulos con
///      estado exponen `setComplianceContract`/authorized). Bucle acotado por MAX_MODULES.
contract ComplianceAggregator is ICompliance, Ownable {
    uint256 public constant MAX_MODULES = 25;

    address public token; // token vinculado (llama a los hooks)
    ICompliance[] private _modules;
    mapping(address => bool) public isModule;

    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);
    event TokenBound(address indexed token);

    modifier onlyToken() {
        require(msg.sender == token, "Aggregator: not token");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) { }

    /// @notice Vincula el token que disparará los hooks de compliance.
    function bindToken(address token_) external onlyOwner {
        require(token_ != address(0), "Aggregator: zero token");
        token = token_;
        emit TokenBound(token_);
    }

    function addModule(address module) external onlyOwner {
        require(module != address(0), "Aggregator: zero module");
        require(!isModule[module], "Aggregator: exists");
        require(_modules.length < MAX_MODULES, "Aggregator: too many");
        isModule[module] = true;
        _modules.push(ICompliance(module));
        emit ModuleAdded(module);
    }

    function removeModule(address module) external onlyOwner {
        require(isModule[module], "Aggregator: not module");
        isModule[module] = false;
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (address(_modules[i]) == module) {
                _modules[i] = _modules[len - 1];
                _modules.pop();
                break;
            }
        }
        emit ModuleRemoved(module);
    }

    function modules() external view returns (ICompliance[] memory) {
        return _modules;
    }

    function moduleCount() external view returns (uint256) {
        return _modules.length;
    }

    // ---- ICompliance ----

    /// @notice Pasa solo si todos los módulos aprueban.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool) {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (!_modules[i].canTransfer(from, to, amount)) return false;
        }
        return true;
    }

    function transferred(address from, address to, uint256 amount) external onlyToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            _modules[i].transferred(from, to, amount);
        }
    }

    function created(address to, uint256 amount) external onlyToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            _modules[i].created(to, amount);
        }
    }

    function destroyed(address from, uint256 amount) external onlyToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            _modules[i].destroyed(from, amount);
        }
    }
}
