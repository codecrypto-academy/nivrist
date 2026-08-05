// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IIdentityRegistry } from "../interfaces/IIdentityRegistry.sol";
import { ICompliance } from "../interfaces/ICompliance.sol";

/// @title Token — security token ERC-3643 (permissioned), cloneable
/// @notice ERC-20 con restricciones de transferencia: el receptor debe estar verificado en el
///         IdentityRegistry, ninguna parte congelada, y la transferencia debe cumplir el
///         compliance (ComplianceAggregator). Roles OWNER (admin) y AGENT (operativa).
/// @dev Cloneable vía EIP-1167: name/symbol/decimals se fijan en `init` (no en el constructor),
///      sobreescribiendo los getters de ERC20.
contract Token is ERC20, AccessControl {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    string private _tokenName;
    string private _tokenSymbol;
    uint8 private _tokenDecimals;
    bool private _initialized;
    bool public paused;

    IIdentityRegistry public identityRegistry;
    ICompliance public compliance;
    mapping(address => bool) public frozen;

    event TokenInitialized(string name, string symbol, uint8 decimals);
    event AddressFrozen(address indexed account, bool frozen);
    event Paused(bool status);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount);

    // El constructor deja name/symbol vacíos (los fija init) → apto para clones.
    constructor() ERC20("", "") { }

    /// @notice Inicializa el clon: metadatos, admin, identity registry y compliance.
    function init(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address admin,
        address identityRegistry_,
        address compliance_
    ) external {
        require(!_initialized, "Token: initialized");
        require(admin != address(0), "Token: zero admin");
        _initialized = true;
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _tokenDecimals = decimals_;
        identityRegistry = IIdentityRegistry(identityRegistry_);
        compliance = ICompliance(compliance_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGENT_ROLE, admin);
        emit TokenInitialized(name_, symbol_, decimals_);
    }

    // ---- metadata (sobreescrita para clones) ----
    function name() public view override returns (string memory) {
        return _tokenName;
    }

    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    // ---- operativa de agente ----
    function mint(address to, uint256 amount) external onlyRole(AGENT_ROLE) {
        require(identityRegistry.isVerified(to), "Token: receiver not verified");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(AGENT_ROLE) {
        _burn(from, amount);
    }

    /// @notice Transferencia forzada (recuperación/regulatoria). Salta compliance pero exige
    ///         receptor verificado.
    function forcedTransfer(address from, address to, uint256 amount)
        external
        onlyRole(AGENT_ROLE)
    {
        require(identityRegistry.isVerified(to), "Token: receiver not verified");
        _forced = true;
        _transfer(from, to, amount);
        _forced = false;
        emit ForcedTransfer(from, to, amount);
    }

    function setFrozen(address account, bool status) external onlyRole(AGENT_ROLE) {
        frozen[account] = status;
        emit AddressFrozen(account, status);
    }

    function setPaused(bool status) external onlyRole(AGENT_ROLE) {
        paused = status;
        emit Paused(status);
    }

    function setIdentityRegistry(address ir) external onlyRole(DEFAULT_ADMIN_ROLE) {
        identityRegistry = IIdentityRegistry(ir);
    }

    function setCompliance(address c) external onlyRole(DEFAULT_ADMIN_ROLE) {
        compliance = ICompliance(c);
    }

    // ---- núcleo de restricciones ----
    bool private _forced; // permite saltar compliance en forcedTransfer

    function _update(address from, address to, uint256 amount) internal virtual override {
        bool isMint = from == address(0);
        bool isBurn = to == address(0);

        if (!isMint && !isBurn) {
            // El receptor siempre debe estar verificado, incluso en transferencia forzada.
            require(identityRegistry.isVerified(to), "Token: receiver not verified");
            // La transferencia forzada (recuperación regulatoria) salta pausa, congelación y
            // compliance; el resto de transferencias los exige.
            if (!_forced) {
                require(!paused, "Token: paused");
                require(!frozen[from] && !frozen[to], "Token: frozen");
                require(compliance.canTransfer(from, to, amount), "Token: not compliant");
            }
        }

        super._update(from, to, amount);

        // hooks de estado (después del movimiento)
        if (isMint) {
            compliance.created(to, amount);
        } else if (isBurn) {
            compliance.destroyed(from, amount);
        } else {
            compliance.transferred(from, to, amount);
        }
    }

    // ---- resolución de herencia ----
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
