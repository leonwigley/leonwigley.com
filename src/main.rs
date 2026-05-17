use axum::{
    Router,
    extract::{Path, State},
    http::{StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use pulldown_cmark::{Options, Parser, html};
use serde::Serialize;
use std::{env, net::SocketAddr, sync::Arc};
use tera::{Context, Tera};
use tokio::fs;

#[derive(Clone)]
struct AppState {
    templates: Arc<Tera>,
}

#[derive(Clone, Serialize)]
struct BlogPost {
    slug: String,
    title: String,
    date: Option<String>,
    html: String,
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
        .route("/blog", get(blog_handler))
        .route("/blog/:slug", get(blog_post_handler))
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

async fn blog_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut context = Context::new();

    match load_blog_posts().await {
        Ok(posts) => {
            context.insert("posts", &posts);
            state.render("blog.html", context).into_response()
        }
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to load blog posts: {err}"),
        )
            .into_response(),
    }
}

async fn blog_post_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    match load_blog_posts().await {
        Ok(posts) => {
            if let Some(post) = posts.into_iter().find(|post| post.slug == slug) {
                let mut context = Context::new();
                context.insert("post", &post);
                return state.render("blog_post.html", context).into_response();
            }

            state.render("404.html", Context::new()).into_response()
        }
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to load blog post: {err}"),
        )
            .into_response(),
    }
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

async fn load_blog_posts() -> Result<Vec<BlogPost>, std::io::Error> {
    let mut entries = fs::read_dir("./content/blog").await?;
    let mut posts = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }

        let Some(stem) = path.file_stem().and_then(|stem| stem.to_str()) else {
            continue;
        };

        let source = fs::read_to_string(&path).await?;
        let title = extract_title(&source).unwrap_or_else(|| slug_to_title(stem));
        let date = extract_date_from_slug(stem);
        let html = markdown_to_html(&source);

        posts.push(BlogPost {
            slug: stem.to_string(),
            title,
            date,
            html,
        });
    }

    posts.sort_by(|a, b| b.slug.cmp(&a.slug));
    Ok(posts)
}

fn extract_title(markdown: &str) -> Option<String> {
    markdown.lines().find_map(|line| {
        line.strip_prefix("# ")
            .map(str::trim)
            .filter(|title| !title.is_empty())
            .map(str::to_string)
    })
}

fn slug_to_title(slug: &str) -> String {
    slug.split('-')
        .filter(|segment| !segment.is_empty())
        .map(|segment| {
            let mut chars = segment.chars();
            match chars.next() {
                Some(first) => {
                    let mut word = first.to_uppercase().collect::<String>();
                    word.push_str(chars.as_str());
                    word
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);

    let parser = Parser::new_ext(markdown, options);
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

fn extract_date_from_slug(slug: &str) -> Option<String> {
    let mut parts = slug.splitn(4, '-');
    let year = parts.next()?;
    let month = parts.next()?;
    let day = parts.next()?;

    if year.len() != 4 || month.len() != 2 || day.len() != 2 {
        return None;
    }

    if !year.chars().all(|c| c.is_ascii_digit())
        || !month.chars().all(|c| c.is_ascii_digit())
        || !day.chars().all(|c| c.is_ascii_digit())
    {
        return None;
    }

    let month_name = match month {
        "01" => "Jan",
        "02" => "Feb",
        "03" => "Mar",
        "04" => "Apr",
        "05" => "May",
        "06" => "Jun",
        "07" => "Jul",
        "08" => "Aug",
        "09" => "Sep",
        "10" => "Oct",
        "11" => "Nov",
        "12" => "Dec",
        _ => return None,
    };

    Some(format!("{} {} {}", day, month_name, year))
}
