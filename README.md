# Von Ton zu Ton

## Configure env
Copy `.env-example to .env`.

## Install dependencies
```sh
npm install
```

## Run in dev mode
```sh
npm run dev
```

## try
After starting and if you didn't make any changes to `.env`, you can 
- Visit the client at: [http://localhost:5173](http://localhost:5173)
- Backend will run at: [http://localhost:3000](http://localhost:3000)

### allow self signed https certificates
The development server and the backend are using self signed https certificates. You will probably tell your browser to trust these certificates. You'll have to manually navigate to your backend once and accept its certificate, so that the websocket connection established from the client won't be rejected. 

## nx monorepo tips
### Understand this workspace
Run `nx graph` to see a diagram of the dependencies of the projects.

### Further help
Visit the [Nx Documentation](https://nx.dev) to learn more.
