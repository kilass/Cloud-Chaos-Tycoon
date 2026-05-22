# 🚀 Cloud Chaos Tycoon (v7.5)

**Cloud Chaos Tycoon** est un simulateur de gestion d'infrastructure Cloud et de Chaos Engineering interactif et immersif sous forme de jeu cyberpunk rétro-futuriste. 

Devenez le **Principal Cloud Architect / VP of Engineering** d'une startup SaaS en pleine croissance. Votre mission est de concevoir, déployer et faire évoluer une infrastructure cloud résiliente, de signer des contrats de services (SLA), d'optimiser les coûts opérationnels et de survivre à des vagues d'incidents provoqués par la simulation (ou par vos propres agents de Chaos Engineering).

---

## 🎮 Concept du Jeu
Le trafic utilisateur arrive en direct sur votre schéma d'architecture sous forme de paquets de données visuels. Vous devez assembler des briques de services GCP (Google Cloud Platform) ou auto-hébergées sur des machines virtuelles (IaaS) pour acheminer, traiter et stocker ces requêtes en respectant les contraintes imposées :
* **Débit Réseau (QPS)** : Gérer la charge et répartir les flux.
* **Latence (ms)** : Minimiser les temps de réponse pour maximiser la satisfaction client.
* **SLA (Service Level Agreement)** : Maintenir un taux de disponibilité supérieur au seuil exigé par vos clients (ex: 99.9%).
* **Budget ($)** : Équilibrer les coûts de provisionnement et de maintenance par rapport à vos revenus récurrents.

---

## ✨ Fonctionnalités Clés

### 1. 🖥️ Schéma Réseau Temps Réel Interactif
* **Canvas Cyberpunk** : Une grille d'architecture divisée en zones fonctionnelles (WAN / Cache, Security, Load Balancing, CI/CD, Message Brokers, Monitoring, Compute, AI & Analytics, Data Storage et Chaos Engineering).
* **Fiches Statistiques Glassmorphic** : Chaque nœud déployé affiche à sa droite une mini-fiche translucide présentant sa charge CPU/DB/Queue en temps réel.
* **Indicateurs de Pannes** : Les nœuds clignotent et virent au rouge lors des pannes ou des surcharges.

### 2. 🗃️ Catalogue Cloud GCP vs Auto-Hébergé
* **Réseau & Edge** : Cloud CDN Cache, Cloud Armor WAF, ModSecurity, Load Balancers Régionaux ou Globaux.
* **Calcul (Compute)** : VMs brutes (Compute Engine), Serverless (Cloud Run), Kubernetes (GKE), Functions.
* **Stockage & Bases de Données** : Postgres SQL (Master / Replica / VMs auto-gérées), Google Cloud Spanner (Global), Redis Cache (VMs ou Cloud Memorystore), Cloud Storage (GCS).
* **Sécurité & DevOps** : Secret Manager, HashiCorp Vault, IAM Security Rules, GitOps (ArgoCD), Cloud Monitoring, Prometheus & Grafana, OpenTelemetry.

### 3. 🎓 Académie DevOps (Mode Tutoriel)
* Un parcours interactif pas à pas en 6 étapes pour guider le joueur à travers les concepts essentiels (déploiement de load balancer, gestion de la charge CPU, mise en cache et résolution d'incidents).

### 4. 📈 Missions & Gestion de Contrats
* Signez des contrats de services avec différents profils de clients (*Startup Blog*, *E-Commerce Scaleup*, *High-Frequency Trading API*, etc.) possédant chacun des exigences de trafic et de SLA propres.
* Remplissez les objectifs techniques à long terme pour débloquer le contrat ultime du **SaaS Enterprise**.

---

## 🛠️ Stack Technique
Le projet a été développé dans une optique de légèreté et de performance maximale :
* **HTML5** : Structure de l'interface et console de diagnostics.
* **CSS3 (Vanilla)** : Design système cyberpunk néon, animations de flux et effets de verre dépoli (*glassmorphism*).
* **JavaScript (ES6+)** : Logique de simulation physique du réseau, boucle de jeu (`requestAnimationFrame`), calcul de la latence globale et routage des paquets de requêtes.
* **Rendu SVG Dynamique** : Icônes vectorielles légères encodées et injectées sous forme d'URIs de données pour un rendu optimal sur le Canvas HTML5 sans requêtes HTTP superflues.

---

## 🚀 Démarrage Rapide

### Hébergement Local
1. Clonez ce dépôt.
2. Démarrez un serveur HTTP local (par exemple avec Node.js, Python ou via l'extension Live Server de VS Code).
   * *Exemple avec Node.js (intégré)* :
     ```bash
     node -e "const http = require('http'); const fs = require('fs'); const path = require('path'); http.createServer((req, res) => { let filePath = '.' + req.url; if (filePath == './') filePath = './index.html'; const extname = path.extname(filePath); let contentType = 'text/html'; switch (extname) { case '.js': contentType = 'text/javascript'; break; case '.css': contentType = 'text/css'; break; case '.png': contentType = 'image/png'; break; case '.svg': contentType = 'image/svg+xml'; break; } fs.readFile(filePath, (err, content) => { if (err) { res.writeHead(404); res.end('Not Found'); } else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); } }); }).listen(8080); console.log('Serveur démarré sur http://localhost:8080/');"
     ```
3. Ouvrez votre navigateur sur [http://localhost:8080/](http://localhost:8080/).

---

## 🔬 Concepts SRE & Cloud représentés
* **SLA & SLI** : La disponibilité de l'application est mesurée à chaque tick et influe directement sur la confiance globale de vos clients.
* **Edge Caching** : Réduction drastique de la charge sur le serveur d'application en servant le contenu statique en périphérie.
* **Database Replication** : L'ajout de replicas permet de distribuer la charge de lecture et d'augmenter le débit de requêtes supporté par la base de données.
* **Chaos Engineering** : En installant le *Chaos Mesh Daemon*, vous pouvez forcer votre système à subir des pannes pour tester sa tolérance aux pannes (*fault tolerance*) et la vitesse de rétablissement du SLA.
