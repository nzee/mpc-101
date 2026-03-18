mod protocol;
mod routes;
mod state;
mod types;

use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use state::AppState;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    let app_state = AppState::default();

    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "./static".to_string());

    let app = Router::new()
        .route("/api/dkg", post(routes::dkg))
        .route("/api/sign", post(routes::sign))
        .route("/api/verify", post(routes::verify))
        .route("/api/state", get(routes::app_state))
        .layer(cors)
        .with_state(app_state)
        .fallback_service(ServeDir::new(&static_dir));

    let listener = TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("MPC server listening on http://localhost:3000");
    axum::serve(listener, app)
        .await
        .expect("Server crashed");
}
