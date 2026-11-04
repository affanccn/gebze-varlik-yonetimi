package tr.gov.gebze.varlik.config;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. Hash'li Vite üretim varlıkları (/app-assets/**): 1 yıl değişmez (immutable) önbellek
        registry.addResourceHandler("/app-assets/**")
                .addResourceLocations("classpath:/static/app-assets/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable());

        // 2. Kök ve SPA rotaları için Fallback Çözümleyicisi
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }

                        // API (/api/**), Swagger (/v3/**, /swagger-ui/**), Actuator (/actuator/**)
                        // veya dosya uzantısı içeren (.js, .css, .png vb.) istekler index.html'e YÖNLENMESİN (404 dönsün)
                        if (resourcePath.startsWith("api/") || resourcePath.equals("api")
                                || resourcePath.startsWith("v3/") || resourcePath.equals("v3")
                                || resourcePath.startsWith("actuator/") || resourcePath.equals("actuator")
                                || resourcePath.startsWith("swagger-ui")
                                || resourcePath.contains(".")) {
                            return null;
                        }

                        // Diğer tüm SPA rotaları (/dashboard, /assets, /users, /assignments vb.) index.html'e gider
                        return location.createRelative("index.html");
                    }
                });
    }
}

