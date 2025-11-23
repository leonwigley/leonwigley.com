use actix_files::Files;
use actix_files::NamedFile;
use actix_web::{App, HttpRequest, HttpServer, Result, http::header};

async fn pdf_handler(_req: HttpRequest) -> Result<NamedFile> {
    let file = NamedFile::open("./public/assets/resume.pdf")?;
    Ok(file
        .use_last_modified(true)
        .set_content_disposition(header::ContentDisposition {
            disposition: header::DispositionType::Inline,
            parameters: vec![],
        }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // Cache-Control
            .wrap(
                actix_web::middleware::DefaultHeaders::new()
                    .add((header::CACHE_CONTROL, "public, max-age=31536000, immutable")),
            )
            // PDF route
            .route("/resume.pdf", actix_web::web::get().to(pdf_handler))
            // Public
            .service(
                Files::new("/", "./public")
                    .index_file("index.html")
                    .use_last_modified(true)
                    .use_etag(true)
                    .prefer_utf8(true)
                    .redirect_to_slash_directory(),
            )
    })
    .bind(("localhost", 3000))?
    .run()
    .await
}
