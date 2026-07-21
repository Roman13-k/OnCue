//! Timed schedule engine: storage, time windows, dedupe, notifications, background ticks.

#[cfg(windows)]
pub mod aumid;
pub mod cancel;
mod engine;
mod fired;
pub mod storage;
mod toast;
mod window;

pub use engine::start;
