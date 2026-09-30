//! Thin router kept separate so both the WS server and (future) local callers
//! can share dispatch. All methods live in `session::handle`.

use serde_json::Value;

pub fn dispatch(state: &std::sync::Arc<crate::CompositorState>, method: &str, params: &Value) -> Value {
    match crate::session::handle(state, method, params) {
        Ok(v) => v,
        Err(e) => {
            tracing::debug!("rpc {method} error: {e}");
            Value::String(format!("error: {e}"))
        }
    }
}
