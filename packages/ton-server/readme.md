## install dependencies
`yarn`

## mkcert for https
Create a https certificate in the repo root: 

`yarn mkcert create-ca`

You then have to open the url of your ton-server once with your browser and accept the certificate, otherwise you'll get errors in the client. 
