package com.parkflow;
import io.jsonwebtoken.Jwts;
import java.util.Map;
public class JwtBuilderTest {
    public static void main(String[] args) {
        var jwt = Jwts.builder()
            .subject("my-sub")
            .claim("cid", "my-cid")
            .claims(Map.of("role", "ADMIN"))
            .compact();
        System.out.println(jwt);
    }
}
