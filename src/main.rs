use axum::{
    Router,
    extract::State,
    http::{StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use handlebars::Handlebars;
use serde_json::json;
use std::{env, net::SocketAddr, sync::Arc};
use tokio::fs;

// 1. Define a state struct to share Handlebars across the app
struct AppState {
    hbs: Handlebars<'static>,
}

#[tokio::main]
async fn main() {
    // 2. Setup Handlebars
    let mut hbs = Handlebars::new();
    // Register the templates by name
    hbs.register_template_file("layout", "./templates/layout.html")
        .unwrap();
    hbs.register_template_file("index", "./templates/index.html")
        .unwrap();
    hbs.register_template_file("404", "./templates/404.html")
        .unwrap();

    // Wrap in Arc for thread-safe sharing
    let app_state = Arc::new(AppState { hbs });

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3000".into())
        .parse()
        .unwrap();

    println!("Server running at http://localhost:{port}/");

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/resume.pdf", get(resume_pdf))
        // The fallback handles all other paths (static files or 404s)
        .fallback(static_handler)
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

// Helper function to render a page inside the layout
fn render_page(hbs: &Handlebars, template_name: &str) -> String {
    // 1. Render the inner content (index or 404)
    let inner_content = hbs
        .render(template_name, &json!({}))
        .unwrap_or_else(|_| "Render error".to_string());

    // 2. Render the layout and pass the inner content into the {{{content}}} variable
    hbs.render("layout", &json!({ "content": inner_content }))
        .unwrap_or_else(|e| format!("Layout render error: {}", e))
}

// Handler for the Homepage
async fn index_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let body = render_page(&state.hbs, "index");
    Html(body)
}

// Handler for Static Files (CSS, JS, Images)
// If a file is not found, it renders the custom 404 template
async fn static_handler(State(state): State<Arc<AppState>>, uri: Uri) -> Response {
    let path = uri.path();
    let file_path = format!("./public{path}");

    match fs::read(&file_path).await {
        Ok(bytes) => {
            // File found: serve it with correct mime type
            (
                StatusCode::OK,
                [
                    ("Content-Type", mime_from_path(&file_path)),
                    ("Cache-Control", "no-store, no-cache, must-revalidate"),
                ],
                bytes,
            )
                .into_response()
        }
        Err(_) => {
            // File not found: Render the 404 Template
            let body = render_page(&state.hbs, "404");
            (StatusCode::NOT_FOUND, Html(body)).into_response()
        }
    }
}

// --- Keep existing helper functions ---

async fn resume_pdf() -> impl IntoResponse {
    match fs::read("./public/assets/resume.pdf").await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                ("Content-Type", "application/pdf"),
                ("Content-Disposition", "inline"),
            ],
            bytes,
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
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
