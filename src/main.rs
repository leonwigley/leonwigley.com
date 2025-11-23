use actix_files::Files;
use actix_web::{App, HttpServer, web};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // Serve ./public at root URL "/"
            .service(
                Files::new("/", "./public")
                    .index_file("index.html")
                    .use_last_modified(true)
                    .redirect_to_slash_directory(),
            )
            // Example route
            .route("/hello", web::get().to(|| async { "Hello!" }))
    })
    .bind(("localhost", 8080))?
    .run()
    .await
}
