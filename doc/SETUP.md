
https://github.com/hokein/electron-sample-apps/tree/master/client-certificate

```
openssl genrsa -out server_key.pem 2048

openssl req -batch -new -key server_key.pem -out server_csr.pem \
-subj "/C=JP/ST=Tokyo/O=exhands.org/OU=node-red/CN=node-red.exhands.org"

openssl x509 -in server_csr.pem -out server_crt.pem -req \
-signkey server_key.pem -days 73000 -sha256


```