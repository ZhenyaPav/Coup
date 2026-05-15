# Coup Helm Chart

Deploys the Coup web app and API as a single Kubernetes `Deployment`.

## Install

```bash
helm upgrade --install coup ./deploy/helm/coup
```

The default image is:

```text
ghcr.io/zhenyapav/coup-app:latest
```

## Use a Specific Image Tag

```bash
helm upgrade --install coup ./deploy/helm/coup \
  --set image.tag=<commit-sha>
```

## Enable Ingress

Use the external ingress values file:

```bash
helm upgrade --install coup ./deploy/helm/coup \
  -f ./deploy/helm/coup/values-external.yaml
```

Set your domain and ingress class in `values-external.yaml`:

```yaml
ingress:
  className: nginx
  host: coup.example.com
```

Or pass values directly:

```bash
helm upgrade --install coup ./deploy/helm/coup \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.host=coup.example.com
```

Set `ingress.className` to the ingress controller installed in your cluster,
commonly `nginx` or `traefik`, and point your DNS record at that controller's
external address. `/api/rules` renders examples from the request's
`X-Forwarded-Proto` and `X-Forwarded-Host` headers, which are normally set by
the ingress controller.

For TLS with cert-manager:

```bash
helm upgrade --install coup ./deploy/helm/coup \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.host=coup.example.com \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].secretName=coup-tls \
  --set ingress.tls[0].hosts[0]=coup.example.com
```

## Private GHCR Package

If the GHCR package is private, create an image pull secret and reference it:

```bash
kubectl create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<github-user> \
  --docker-password=<github-token>

helm upgrade --install coup ./deploy/helm/coup \
  --set imagePullSecrets[0].name=ghcr-pull
```

## Scaling Note

The game state currently lives in the server process memory. Keep `replicaCount`
at `1` unless you add sticky sessions or move game state to shared storage.
