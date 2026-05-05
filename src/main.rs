use axum::{
    Router,
    extract::State,
    http::{StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use std::{env, net::SocketAddr, sync::Arc};
use tera::{Context, Tera};
use tokio::fs;

#[derive(Clone)]
struct AppState {
    templates: Arc<Tera>,
}

impl AppState {
    fn render(&self, template: &str, context: Context) -> Html<String> {
        Html(
            self.templates
                .render(template, &context)
                .unwrap_or_else(|e| format!("Template render error: {}", e)),
        )
    }
}

#[tokio::main]
async fn main() {
    // 2. Compile Tera templates
    let templates = Arc::new(Tera::new("templates/**/*").expect("Failed to compile templates"));
    let app_state = AppState { templates };

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3000".into())
        .parse()
        .unwrap();

    println!("Server running at http://localhost:{port}/");

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/ashley", get(ashley_handler))
        .route("/game", get(game_handler))
        .route("/cv.pdf", get(cv_pdf))
        // The fallback handles all other paths (static files or 404s)
        .fallback(static_handler)
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

// Handler for the Homepage
async fn index_handler(State(state): State<AppState>) -> impl IntoResponse {
    state.render("index.html", Context::new())
}

async fn game_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut context = Context::new();
    context.insert("show_background", &false);
    state.render("game.html", context)
}

async fn ashley_handler(State(state): State<AppState>) -> impl IntoResponse {
    state.render("ashley.html", Context::new())
}

// Handler for Static Files (CSS, JS, Images)
// If a file is not found, it renders the custom 404 template
async fn static_handler(State(state): State<AppState>, uri: Uri) -> Response {
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
            state.render("404.html", Context::new()).into_response()
        }
    }
}

// --- Keep existing helper functions ---

async fn cv_pdf() -> impl IntoResponse {
    match fs::read("./public/assets/cv.pdf").await {
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
