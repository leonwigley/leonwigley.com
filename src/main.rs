use axum::{
    Router,
    http::{HeaderValue, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::get,
};
use std::{env, net::SocketAddr};
use tokio::fs;

#[tokio::main]
async fn main() {
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3000".into())
        .parse()
        .unwrap();

    println!("Server running at http://localhost:{port}/");

    let app = Router::new()
        .route("/resume.pdf", get(resume_pdf))
        .fallback(get(static_file));

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

fn mime_from_path(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html"
    } else if path.ends_with(".css") {
        "text/css"
    } else if path.ends_with(".js") {
        "application/javascript"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".pdf") {
        "application/pdf"
    } else {
        "application/octet-stream"
    }
}

fn no_cache_headers() -> [(&'static str, &'static str); 1] {
    [("Cache-Control", "no-store, no-cache, must-revalidate")]
}

async fn resume_pdf() -> impl IntoResponse {
    match fs::read("./public/assets/resume.pdf").await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                ("Content-Type", "application/pdf"),
                ("Content-Disposition", "inline"),
                no_cache_headers()[0],
            ],
            bytes,
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}

async fn static_file(uri: Uri) -> Response {
    let req_path = uri.path();

    let path = if req_path == "/" {
        "./public/index.html".to_string()
    } else {
        format!("./public{req_path}")
    };

    match fs::read(&path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                ("Content-Type", mime_from_path(&path)),
                no_cache_headers()[0],
            ],
            bytes,
        )
            .into_response(),

        Err(_) => match fs::read("./public/404.html").await {
            Ok(bytes) => (
                StatusCode::NOT_FOUND,
                [("Content-Type", "text/html"), no_cache_headers()[0]],
                bytes,
            )
                .into_response(),
            Err(_) => (StatusCode::NOT_FOUND, "404 Not Found").into_response(),
        },
    }
}
