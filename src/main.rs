use actix_files::NamedFile;
use actix_web::{
    App, HttpRequest, HttpServer, Responder, Result, http::StatusCode, http::header, middleware,
    web,
};
use std::env;

async fn pdf_handler(_req: HttpRequest) -> Result<NamedFile> {
    let file = NamedFile::open("./public/assets/resume.pdf")?;
    Ok(file
        .use_last_modified(true)
        .set_content_disposition(header::ContentDisposition {
            disposition: header::DispositionType::Inline,
            parameters: vec![],
        }))
}

async fn not_found(_req: HttpRequest) -> Result<impl actix_web::Responder> {
    let file = NamedFile::open("./public/404.html")?.use_last_modified(true);

    Ok(file.customize().with_status(StatusCode::NOT_FOUND))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .expect("PORT must be a number");

    println!("Server started on: http://localhost:{port}/");

    HttpServer::new(|| {
        App::new()
            .wrap(
                middleware::DefaultHeaders::new()
                    .add((header::CACHE_CONTROL, "public, max-age=31536000, immutable")),
            )
            .route("/resume.pdf", web::get().to(pdf_handler))
            .service(
                actix_files::Files::new("/", "./public")
                    .index_file("index.html")
                    .use_last_modified(true)
                    .use_etag(true)
                    .prefer_utf8(true)
                    .redirect_to_slash_directory(),
            )
            .default_service(web::route().to(not_found))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
