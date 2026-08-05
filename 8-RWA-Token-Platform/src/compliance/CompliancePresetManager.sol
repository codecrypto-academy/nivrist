// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ComplianceAggregator } from "./ComplianceAggregator.sol";
import { WhitelistCompliance } from "./modules/WhitelistCompliance.sol";
import { MaxBalanceCompliance } from "./modules/MaxBalanceCompliance.sol";
import { MaxHoldersCompliance } from "./modules/MaxHoldersCompliance.sol";
import { CountryRestrictionCompliance } from "./modules/CountryRestrictionCompliance.sol";
import { DailyTransferLimitCompliance } from "./modules/DailyTransferLimitCompliance.sol";

/// @title CompliancePresetManager — arma un stack de compliance a partir de un preset.
/// @notice Traduce un nivel regulatorio (NONE/BASIC/STANDARD/STRICT) en un conjunto concreto de
///         módulos ya cableados a un ComplianceAggregator. Pensado para que un emisor elija el
///         "perfil" y no tenga que desplegar/configurar módulos a mano.
///
/// - NONE     : sin restricciones (aggregator vacío).
/// - BASIC    : whitelist (solo inversores aprobados pueden recibir).
/// - STANDARD : whitelist + máximo de holders + balance máximo por wallet.
/// - STRICT   : STANDARD + restricción por país + límite diario de transferencia.
contract CompliancePresetManager {
    enum Preset {
        NONE,
        BASIC,
        STANDARD,
        STRICT
    }

    struct Config {
        uint256 maxBalance; // 0 = usa default del preset
        uint256 maxHolders; // 0 = usa default del preset
        uint256 dailyLimit; // 0 = usa default del preset
    }

    struct BuiltModules {
        address whitelist;
        address maxBalance;
        address maxHolders;
        address country;
        address dailyLimit;
    }

    event PresetApplied(address indexed aggregator, Preset preset, address owner);

    /// @notice Despliega y cablea los módulos del `preset` sobre `aggregator`, y transfiere la
    ///         propiedad de cada módulo (y del aggregator) a `owner`.
    /// @dev El caller debe ser owner del `aggregator` (para poder llamar addModule/transferOwnership).
    ///      Los módulos se crean con owner = este manager para poder cablearlos, y al final se
    ///      transfieren a `owner`.
    function applyPreset(
        ComplianceAggregator aggregator,
        address token,
        Preset preset,
        address owner,
        Config calldata cfg
    ) external returns (BuiltModules memory built) {
        if (preset == Preset.NONE) {
            emit PresetApplied(address(aggregator), preset, owner);
            return built;
        }

        // BASIC y superiores: whitelist
        built.whitelist =
            _wire(aggregator, token, address(new WhitelistCompliance(address(this))), owner);

        if (preset == Preset.STANDARD || preset == Preset.STRICT) {
            uint256 maxHolders = cfg.maxHolders == 0 ? 500 : cfg.maxHolders;
            uint256 maxBalance = cfg.maxBalance == 0 ? 100_000 ether : cfg.maxBalance;
            built.maxHolders = _wire(
                aggregator,
                token,
                address(new MaxHoldersCompliance(address(this), maxHolders)),
                owner
            );
            built.maxBalance = _wire(
                aggregator,
                token,
                address(new MaxBalanceCompliance(address(this), maxBalance)),
                owner
            );
        }

        if (preset == Preset.STRICT) {
            uint256 dailyLimit = cfg.dailyLimit == 0 ? 10_000 ether : cfg.dailyLimit;
            built.country = _wire(
                aggregator, token, address(new CountryRestrictionCompliance(address(this))), owner
            );
            built.dailyLimit = _wire(
                aggregator,
                token,
                address(new DailyTransferLimitCompliance(address(this), dailyLimit)),
                owner
            );
        }

        emit PresetApplied(address(aggregator), preset, owner);
    }

    /// @dev Fija token + aggregator en el módulo, lo añade al aggregator y pasa su propiedad a owner.
    function _wire(ComplianceAggregator aggregator, address token, address module, address owner)
        internal
        returns (address)
    {
        ModuleLike(module).setToken(token);
        ModuleLike(module).setComplianceContract(address(aggregator));
        aggregator.addModule(module);
        ModuleLike(module).transferOwnership(owner);
        return module;
    }
}

/// @dev Vista mínima común a todos los módulos (AbstractModule + Ownable).
interface ModuleLike {
    function setToken(address) external;
    function setComplianceContract(address) external;
    function transferOwnership(address) external;
}
