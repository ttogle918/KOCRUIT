package com.kosa.recruit.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("채용 관리 시스템 API")
                .description("Spring Boot + MySQL+ JPA 프로젝트용 Swagger")
                .version("v1.0.0")
            );
    }
}
