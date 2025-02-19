# Existential Deposit Values

## Abstract
---

This document is a review of the implementation and usage of Existential Deposit
values within our runtimes. This will review the maintenance of ED values
from a code and SUDO/Governance perspective.

## Background
---

Existential Deposits are the minimum balance required of an account to exist on
our chains. Given that different tokens will have different values, its 
necessary to have different Existential Deposit values for different tokens.

## Requirements
---

* Be able to define different Existential Deposit values for different
  tokens in the native currency.
* SUDO/Governance must be able to overwrite the predefined Existential Deposit
  values without modifying the code.

## Implementation
---

### Trait `AssetExistentialDepositInspect`

Currently, we store the Existential Deposit of tokens within CurrencyFactory.
We need to implement a trait that allows us to retrieve this information from
Currency Factory.

To keep this in line with the already defined `CurrencyFactory` trait, we 
associate the `AssetId` and `Balance` types.

`code/parachain/frame/composable-traits/src/currency.rs`
```rust
pub trait AssetExistentialDepositInspect {
	type AssetId;
	type Balance;

	fn existential_deposit(asset_id: Self::AssetId) -> Result<Self::Balance, DispatchError>;
}
```

To minimize current and future refactoring, this trait is also implemented onto
Asset Registry as it acts as an interface for Currency Factory.

### Function `multi_existential_deposits`

We currently use the function `multi_existential_deposits` to get the ED of any
given token. In its current implementation, it will attempt to convert the ED of
our native token (`0.1` or `100_000_000_000`) and convert that into the 
equivalent value in the necessary token using 
`PriceConverter::get_price_inverse`.

Instead of the current implementation we want to resolve the ED of a token with 
the following algorithm:

  Given some token ID, `currency_id`

  1. Query Currency Factory for the ED of `currency_id`
		a. Given the ED of a token, convert that into the native asset with either 
			 the ratio from Asset Registry or hard-coded, per-token, math.

  2. If not found in 1, attempt to match `currency_id` to our hard-coded ED 
     values
    
  3. If not found in 1 or 2, return the maximum value of the `Balance` type so
     that unknown assets balances are not tracked as ED would be an impossible 
		 amount to have in an account.
    
The following implementation accomplishes this:

`code/parachain/runtime/common/src/lib.rs`

```rust
pub fn multi_existential_deposits<
	AssetsRegistry: AssetRatioInspect<AssetId = CurrencyId>
		+ AssetExistentialDepositInspect<AssetId = CurrencyId, Balance = Balance>,
>(
	currency_id: &CurrencyId,
) -> Balance {
	AssetsRegistry::existential_deposit(*currency_id)
		.and_then(|ed| PriceConverter::<AssetsRegistry>::get_price_inverse(*currency_id, ed))
		.unwrap_or(match *currency_id {
			CurrencyId::USDT => 1492,
			CurrencyId::KAR => 100_000_000_000,
			CurrencyId::kUSD => 1_492_537_313,
			CurrencyId::KSM => 37_495_314,
			CurrencyId::BNC => 100_000_000_000,
			CurrencyId::vKSM => 100_000_000_000,
			CurrencyId::MOVR => 100_000_000_000,
			_ => Balance::MAX,
		})
}
```

**NOTE**: For runtime benchmarks, an ED of zero is still used for all tokens.
