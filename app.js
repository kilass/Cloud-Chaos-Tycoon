/**
 * Cloud Chaos Tycoon - Core Game Simulation (V3)
 * A standalone, high-performance simulation of cloud infrastructure load, 
 * latency, SLAs, hosting contracts, organic growth, and chaos events.
 * Featuring speed controls, architectural layers, link gauges, and node hovers.
 */

// --- INITIAL STATE & DATABASE ---
const CONTRACTS_TEMPLATE = [
    {
        id: 'startup',
        name: 'Startup Blog (Trafic léger)',
        desc: 'Trafic faible mais revenus rapides pour se lancer.',
        baseQps: 15,
        requiredSla: 80.00,
        revenue: 25,
        upfrontFunding: 0,
        minTrustToSign: 0,
        minSlaToSign: 0,
        reqDetails: [
            { text: 'Aucun prérequis spécifique', check: () => true }
        ],
        reqCheck: () => true
    },
    {
        id: 'ecommerce',
        name: 'E-Commerce Scaleup',
        desc: 'Boutique en ligne dynamique. Exige plusieurs pods de calcul et un cache.',
        baseQps: 50,
        requiredSla: 95.00,
        revenue: 110,
        upfrontFunding: 350,
        minTrustToSign: 60,
        minSlaToSign: 85.00,
        reqDetails: [
            { text: 'Au moins 2 Compute (Calcul)', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.filter(c => c.tier === 'compute').length >= 2;
            }},
            { text: 'Au moins 1 base Memorystore Redis', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'db_redis');
            }}
        ],
        reqCheck: (infra) => {
            const targetInfra = infra || state.infrastructure;
            const comps = targetInfra.components.filter(c => c.tier === 'compute').length;
            const redis = targetInfra.components.some(c => c.type === 'db_redis');
            return comps >= 2 && redis;
        }
    },
    {
        id: 'trading',
        name: 'High-Frequency Trading API',
        desc: 'API financière ultra-basse latence nécessitant une bande passante et un profilage constants.',
        baseQps: 80,
        requiredSla: 99.90,
        revenue: 260,
        upfrontFunding: 500,
        minTrustToSign: 70,
        minSlaToSign: 90.00,
        reqDetails: [
            { text: 'Load Balancer Global (Anycast)', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'lb_global');
            }},
            { text: 'Profilage OpenTelemetry Trace', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'monitoring_trace');
            }},
            { text: 'Latence globale <= 35ms', check: (infra, contract) => {
                const lat = contract && contract.signed ? contract.latency : state.latency;
                return lat <= 35 && lat > 0;
            }}
        ],
        reqCheck: (infra, contract) => {
            const targetInfra = infra || state.infrastructure;
            const hasGlobalLb = targetInfra.components.some(c => c.type === 'lb_global');
            const hasTrace = targetInfra.components.some(c => c.type === 'monitoring_trace');
            const lat = contract && contract.signed ? contract.latency : state.latency;
            return hasGlobalLb && hasTrace && lat <= 35 && lat > 0;
        }
    },
    {
        id: 'saas_ai_assistant',
        name: 'SaaS Gen-AI Assistant',
        desc: 'Génération de réponses par LLM. Demande un Broker asynchrone pour lisser la charge des requêtes IA.',
        baseQps: 140,
        requiredSla: 98.00,
        revenue: 420,
        upfrontFunding: 650,
        minTrustToSign: 75,
        minSlaToSign: 92.00,
        reqDetails: [
            { text: 'Vertex AI Gateway', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'ai_vertex');
            }},
            { text: 'Message Broker (Queue)', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.tier === 'queue');
            }},
            { text: 'Capacité Compute >= 200 QPS', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components
                    .filter(c => c.tier === 'compute')
                    .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0) >= 200;
            }}
        ],
        reqCheck: (infra) => {
            const targetInfra = infra || state.infrastructure;
            const hasVertex = targetInfra.components.some(c => c.type === 'ai_vertex');
            const hasBroker = targetInfra.components.some(c => c.tier === 'queue');
            const compCap = targetInfra.components
                .filter(c => c.tier === 'compute')
                .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0);
            return hasVertex && hasBroker && compCap >= 200;
        }
    },
    {
        id: 'fintech_sec',
        name: 'Néo-Banque Sécurisée',
        desc: 'Système bancaire sécurisé. Exige Spanner, Vault et APM.',
        baseQps: 110,
        requiredSla: 99.95,
        revenue: 390,
        upfrontFunding: 800,
        minTrustToSign: 80,
        minSlaToSign: 94.00,
        reqDetails: [
            { text: 'Coffre HashiCorp Vault', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'security_vault');
            }},
            { text: 'Base Cloud Spanner DB', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'db_spanner');
            }},
            { text: 'Monitoring Prometheus APM', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'monitoring_apm');
            }},
            { text: 'Capacité Compute >= 300 QPS', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components
                    .filter(c => c.tier === 'compute')
                    .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0) >= 300;
            }}
        ],
        reqCheck: (infra) => {
            const targetInfra = infra || state.infrastructure;
            const hasVault = targetInfra.components.some(c => c.type === 'security_vault');
            const hasSpanner = targetInfra.components.some(c => c.type === 'db_spanner');
            const hasApm = targetInfra.components.some(c => c.type === 'monitoring_apm');
            const compCap = targetInfra.components
                .filter(c => c.tier === 'compute')
                .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0);
            return hasVault && hasSpanner && hasApm && compCap >= 300;
        }
    },
    {
        id: 'bigdata_enterprise',
        name: 'Big Data Analytics Enterprise',
        desc: 'Hébergement d\'analytique à haute charge. Requiert GitOps et BigQuery.',
        baseQps: 200,
        requiredSla: 99.00,
        revenue: 650,
        upfrontFunding: 1000,
        minTrustToSign: 85,
        minSlaToSign: 95.00,
        reqDetails: [
            { text: 'BigQuery Analytics', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'ai_bigquery');
            }},
            { text: 'Pipeline DevOps GitOps', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'cicd_gitops');
            }},
            { text: 'CDN Edge Cache activé', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.cdnActive || targetInfra.components.some(c => c.type === 'cdn');
            }},
            { text: 'Capacité Compute >= 400 QPS', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components
                    .filter(c => c.tier === 'compute')
                    .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0) >= 400;
            }}
        ],
        reqCheck: (infra) => {
            const targetInfra = infra || state.infrastructure;
            const hasBq = targetInfra.components.some(c => c.type === 'ai_bigquery');
            const hasGitops = targetInfra.components.some(c => c.type === 'cicd_gitops');
            const hasCdn = targetInfra.cdnActive || targetInfra.components.some(c => c.type === 'cdn');
            const compCap = targetInfra.components
                .filter(c => c.tier === 'compute')
                .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0);
            return hasBq && hasGitops && hasCdn && compCap >= 400;
        }
    },
    {
        id: 'saas_ai',
        name: 'SaaS Enterprise Chaos-Resilient (Ultime)',
        desc: 'Contrat Ultime de Victoire. Maintenez sa charge et son SLA à 99.95% pendant 30s !',
        baseQps: 300,
        requiredSla: 99.95,
        revenue: 1200,
        upfrontFunding: 1500,
        minTrustToSign: 90,
        minSlaToSign: 98.00,
        reqDetails: [
            { text: 'Chaos Mesh Daemon', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'chaos_mesh');
            }},
            { text: 'Pipeline DevOps GitOps', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'cicd_gitops');
            }},
            { text: 'Coffre HashiCorp Vault', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'security_vault');
            }},
            { text: 'Base Cloud Spanner DB', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components.some(c => c.type === 'db_spanner');
            }},
            { text: 'CDN Edge Cache activé', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.cdnActive || targetInfra.components.some(c => c.type === 'cdn');
            }},
            { text: 'Capacité Compute >= 500 QPS', check: (infra) => {
                const targetInfra = infra || state.infrastructure;
                return targetInfra.components
                    .filter(c => c.tier === 'compute')
                    .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0) >= 500;
            }}
        ],
        reqCheck: (infra) => {
            const targetInfra = infra || state.infrastructure;
            const compCap = targetInfra.components
                .filter(c => c.tier === 'compute')
                .reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0);
            const hasSpanner = targetInfra.components.some(c => c.type === 'db_spanner');
            const hasCdn = targetInfra.cdnActive || targetInfra.components.some(c => c.type === 'cdn');
            const hasGitops = targetInfra.components.some(c => c.type === 'cicd_gitops');
            const hasVault = targetInfra.components.some(c => c.type === 'security_vault');
            const hasChaos = targetInfra.components.some(c => c.type === 'chaos_mesh');
            return compCap >= 500 && hasSpanner && hasCdn && hasGitops && hasVault && hasChaos;
        }
    }
];

const COMPONENT_METRICS = {
    // COMPOSANTS PAR DÉFAUT / COMPATIBILITÉ
    lb_regional: { 
        name: "Regional HTTP LB", 
        cost: 120, 
        maintenance: 2, 
        maxQps: 150, 
        latencyOverhead: 10, 
        tier: 'lb', 
        provider: "GCP", 
        desc: "Répartiteur de charge HTTP régional. Capacité : 150 QPS. Modérément performant.", 
        concept: "Un Load Balancer régional distribue le trafic au sein d'une seule région Google Cloud.",
        functionSummary: "Routage local du trafic applicatif.",
        targetNeed: "Équilibrage de charge mono-région.",
        tags: ["Réseau", "Régional", "Nominal"]
    },
    db_master: { 
        name: "Postgres SQL Master", 
        cost: 250, 
        maintenance: 8, 
        maxQps: 150, 
        latencyOverhead: 0, 
        tier: 'db', 
        provider: "GCP", 
        desc: "Base de données SQL principale par défaut.", 
        concept: "Une base primaire gère toutes les écritures et réplique les données vers les Read Replicas.",
        functionSummary: "Base relationnelle principale.",
        targetNeed: "Persistance transactionnelle centralisée.",
        tags: ["Données", "Primaire", "Régional"]
    },
    
    // EDGE & NETWORK
    cdn: { 
        name: "Cloud CDN Cache", 
        cost: 150, 
        maintenance: 2, 
        tier: 'wan', 
        provider: "GCP", 
        desc: "Cache statique Edge mondial de Google. Réduit la latence globale de 15ms.", 
        concept: "Cloud CDN utilise Anycast pour mettre en cache le contenu au plus près des utilisateurs finaux.",
        functionSummary: "Mise en cache en périphérie (Edge).",
        targetNeed: "Accélération statique mondiale.",
        tags: ["Réseau", "Caching", "Anycast", "Serverless"]
    },
    cdn_varnish: { 
        name: "Varnish Cache GCE", 
        cost: 90, 
        maintenance: 4, 
        tier: 'wan', 
        provider: "VM", 
        desc: "Cache Edge auto-hébergé sur VM. Réduit la latence de 12ms. Plus de maintenance.", 
        concept: "Varnish sur VM nécessite la gestion manuelle de l'OS, des correctifs et de la scalabilité.",
        functionSummary: "Cache HTTP auto-géré.",
        targetNeed: "Caching sur mesure.",
        tags: ["IaaS", "Caching", "Manuel"]
    },
    waf: { 
        name: "Cloud Armor WAF", 
        cost: 250, 
        maintenance: 5, 
        latencyOverhead: 5, 
        tier: 'wan', 
        provider: "GCP", 
        desc: "WAF managé de Google. Filtre 90% du trafic DDoS passivement.", 
        concept: "Cloud Armor s'intègre nativement au Load Balancer HTTP(S) et applique des règles de filtrage en périphérie.",
        functionSummary: "Pare-feu applicatif managé.",
        targetNeed: "Protection contre le Top 10 OWASP & DDoS.",
        tags: ["Sécurité", "Managé", "Edge"]
    },
    waf_modsec: { 
        name: "ModSecurity WAF", 
        cost: 130, 
        maintenance: 8, 
        latencyOverhead: 8, 
        tier: 'wan', 
        provider: "VM", 
        desc: "Pare-feu applicatif open-source configuré sur VM. Filtre 80% du trafic DDoS.", 
        concept: "ModSecurity sur Nginx demande une expertise système pour optimiser et mettre à jour les signatures de règles.",
        functionSummary: "Pare-feu applicatif open-source.",
        targetNeed: "Protection DDoS personnalisée.",
        tags: ["IaaS", "Sécurité", "Manuel"]
    },
    lb_global: { 
        name: "Global HTTP(S) LB", 
        cost: 350, 
        maintenance: 8, 
        maxQps: 1000, 
        latencyOverhead: 3, 
        tier: 'lb', 
        provider: "GCP", 
        desc: "Routage mondial Anycast ultra-scalable. Capacité massive de 1000 QPS.", 
        concept: "Le Global Load Balancer offre une IP Anycast mondiale et route vers la région la plus proche de l'utilisateur.",
        functionSummary: "Routage Anycast mondial intelligent.",
        targetNeed: "Équilibrage multi-région haute performance.",
        tags: ["Réseau", "Mondial", "Anycast", "Haute Dispo"]
    },
    lb_haproxy: { 
        name: "HAProxy on VM", 
        cost: 180, 
        maintenance: 9, 
        maxQps: 500, 
        latencyOverhead: 6, 
        tier: 'lb', 
        provider: "VM", 
        desc: "Répartiteur logiciel sur VM dédié. Capacité : 500 QPS. Maintenance système élevée.", 
        concept: "HAProxy est très performant, mais la haute disponibilité (failover) doit être gérée manuellement.",
        functionSummary: "Proxy inverse logiciel dédié.",
        targetNeed: "Routage customisé avancé.",
        tags: ["IaaS", "Routage", "Manuel"]
    },
 
    // BUFFER & QUEUE
    queue_pubsub: { 
        name: "Cloud Pub/Sub Buffer", 
        cost: 240, 
        maintenance: 6, 
        maxQueueSize: 300, 
        latencyOverhead: 20, 
        tier: 'queue', 
        provider: "GCP", 
        desc: "Messagerie asynchrone serverless. Capacité tampon : 300 requêtes.", 
        concept: "Pub/Sub est nativement distribué et scalable sans serveur, parfait pour l'ingestion d'événements à grande échelle.",
        functionSummary: "Injest/Buffer de messages serverless.",
        targetNeed: "Découplage asynchrone d'événements.",
        tags: ["Message Queue", "Serverless", "Asynchrone"]
    },
    queue_rabbitmq: { 
        name: "RabbitMQ Broker", 
        cost: 160, 
        maintenance: 7, 
        maxQueueSize: 100, 
        latencyOverhead: 40, 
        tier: 'queue', 
        provider: "VM", 
        desc: "File d'attente sur VM (FIFO). Capacité tampon : 100 requêtes.", 
        concept: "RabbitMQ est idéal pour des topologies de routage complexes (AMQP) mais nécessite de monitorer la RAM de la VM.",
        functionSummary: "Broker de messages AMQP.",
        targetNeed: "Routage complexe de messages (FIFO).",
        tags: ["IaaS", "Message Queue", "Manuel"]
    },
    queue_kafka: { 
        name: "Confluent Kafka", 
        cost: 400, 
        maintenance: 12, 
        maxQueueSize: 600, 
        latencyOverhead: 15, 
        tier: 'queue', 
        provider: "SaaS", 
        desc: "Messagerie distribuée Kafka managée (SaaS). Capacité tampon : 600 requêtes.", 
        concept: "Kafka conserve l'historique des messages sur disque, facilitant le replay et le stream processing massif.",
        functionSummary: "Streaming d'événements distribué.",
        targetNeed: "Journal de commit distribué scalable.",
        tags: ["SaaS", "Event Streaming", "Persistant"]
    },
 
    // COMPUTE
    compute_run: { 
        name: "Cloud Run Container", 
        cost: 300, 
        maintenance: 8, 
        maxQps: 150, 
        latencyOverhead: 5, 
        tier: 'compute', 
        provider: "GCP", 
        desc: "Conteneur serverless. Capacité max : 150 QPS. Autoscaling dynamique rapide.", 
        concept: "Cloud Run abstrait l'infrastructure de calcul et ajuste le nombre d'instances en fonction des requêtes HTTP.",
        functionSummary: "Hébergement de conteneurs serverless.",
        targetNeed: "Microservices scalables à la demande.",
        tags: ["Calcul", "Serverless", "Autoscaling"]
    },
    compute_gke: { 
        name: "Cluster GKE (K8s)", 
        cost: 600, 
        maintenance: 22, 
        maxQps: 400, 
        latencyOverhead: 0, 
        tier: 'compute', 
        provider: "GCP", 
        desc: "Orchestrateur Kubernetes managé. Capacité de 400 QPS. Warmup initial de 10s.", 
        concept: "Google Kubernetes Engine (GKE) gère le plan de contrôle K8s et automatise la gestion des nœuds.",
        functionSummary: "Orchestrateur Kubernetes managé.",
        targetNeed: "Hébergement conteneurisé complexe multi-pod.",
        tags: ["Calcul", "Kubernetes", "Haute Dispo", "Actif-Actif"]
    },
    compute_vm: { 
        name: "VM Compute Engine", 
        cost: 150, 
        maintenance: 3, 
        maxQps: 80, 
        latencyOverhead: 15, 
        tier: 'compute', 
        provider: "GCP", 
        desc: "Instance de calcul brute de base. Capacité : 80 QPS. Très stable.", 
        concept: "Compute Engine offre du IaaS (Infrastructure as a Service). Vous gérez l'OS et les runtimes applicatifs.",
        functionSummary: "Serveur virtuel brut.",
        targetNeed: "Hébergement classique d'applications.",
        tags: ["Calcul", "IaaS", "Stable"]
    },
    compute_functions: { 
        name: "Cloud Functions", 
        cost: 200, 
        maintenance: 4, 
        maxQps: 100, 
        latencyOverhead: 20, 
        tier: 'compute', 
        provider: "GCP", 
        desc: "Code serverless direct. Capacité : 100 QPS. Sujet aux démarrages à froid (Cold Starts).", 
        concept: "Parfait pour le code événementiel, mais subit une latence initiale au démarrage d'une nouvelle instance (Cold Start).",
        functionSummary: "Fonctions serverless (FaaS).",
        targetNeed: "Traitement événementiel léger.",
        tags: ["Calcul", "FaaS", "Serverless"]
    },
 
    // DATABASE & CACHE
    db_spanner: { 
        name: "Cloud Spanner DB", 
        cost: 800, 
        maintenance: 30, 
        maxQps: 1000, 
        latencyOverhead: 0, 
        tier: 'db', 
        provider: "GCP", 
        desc: "Base relationnelle mondiale cohérente. Capacité : 1000 QPS. Aucun deadlock.", 
        concept: "Spanner combine la scalabilité horizontale globale et les transactions ACID grâce à des horloges atomiques.",
        functionSummary: "Base relationnelle distribuée mondialement.",
        targetNeed: "Transactions ACID globales sans verrous.",
        tags: ["Données", "Multi-Région", "ACID", "Pas de Verrous"]
    },
    db_sql_postgres: { 
        name: "Cloud SQL Postgres", 
        cost: 380, 
        maintenance: 10, 
        maxQps: 300, 
        latencyOverhead: 0, 
        tier: 'db', 
        provider: "GCP", 
        desc: "Base Postgres managée par Google. Capacité : 300 QPS.", 
        concept: "Cloud SQL gère automatiquement les backups, les mises à jour et simplifie la configuration de réplicas.",
        functionSummary: "Base de données relationnelle managée.",
        targetNeed: "Transactions SQL classiques.",
        tags: ["Données", "Managé", "SQL"]
    },
    db_postgres_vm: { 
        name: "Self-Postgres VM", 
        cost: 200, 
        maintenance: 14, 
        maxQps: 150, 
        latencyOverhead: 5, 
        tier: 'db', 
        provider: "VM", 
        desc: "Base Postgres auto-hébergée sur VM. Capacité : 150 QPS. Maintenance opérationnelle lourde.", 
        concept: "Évite les surcoûts du managé GCP, mais vous devez configurer la haute disponibilité (Patroni/PGPool) vous-même.",
        functionSummary: "Postgres auto-hébergé.",
        targetNeed: "Base SQL autonome sans surcoût managé.",
        tags: ["Données", "IaaS", "Manuel"]
    },
    db_redis: { 
        name: "Memorystore Redis", 
        cost: 180, 
        maintenance: 4, 
        latencyOverhead: -10, 
        tier: 'db', 
        provider: "GCP", 
        desc: "Cache Redis managé. Absorbe 35% du trafic DB. Latence globale réduite de 10ms.", 
        concept: "Memorystore réduit la charge sur vos bases relationnelles en mettant en cache les requêtes de lecture répétées.",
        functionSummary: "Base de cache clé-valeur en mémoire.",
        targetNeed: "Accélération des lectures et soulagement DB.",
        tags: ["Caching", "In-Memory", "Managé"]
    },
    db_redis_vm: { 
        name: "Self-Redis on VM", 
        cost: 100, 
        maintenance: 7, 
        latencyOverhead: -8, 
        tier: 'db', 
        provider: "VM", 
        desc: "Cache Redis configuré sur VM. Absorbe 30% du trafic SQL. Maintenance plus élevée.", 
        concept: "Héberger Redis sur VM demande de surveiller la persistance (AOF/RDB) et l'utilisation mémoire manuellement.",
        functionSummary: "Redis auto-hébergé sur VM.",
        targetNeed: "Cache clé-valeur en mémoire autonome.",
        tags: ["Caching", "In-Memory", "IaaS"]
    },
    db_gcs: { 
        name: "Cloud Storage (GCS)", 
        cost: 120, 
        maintenance: 1, 
        latencyOverhead: 0, 
        tier: 'db', 
        provider: "GCP", 
        desc: "Stockage d'objets persistant. Capacité virtuellement illimitée. Trés économique.", 
        concept: "GCS est idéal pour le stockage de fichiers statiques, images et sauvegardes d'infrastructure.",
        functionSummary: "Stockage d'objets (Blobs).",
        targetNeed: "Fichiers statiques et backups.",
        tags: ["Stockage", "Serverless", "Économique"]
    },
 
    // OPS & SECURITY
    security_secretmanager: { 
        name: "Secret Manager", 
        cost: 100, 
        maintenance: 2, 
        tier: 'security', 
        provider: "GCP", 
        desc: "Stockage de secrets chiffrés managé. Mitige l'incident de Fuite d'identifiants.", 
        concept: "Secret Manager gère le cycle de vie des clés API et mots de passe avec chiffrement et accès IAM strict.",
        functionSummary: "Coffre de secrets d'API natif GCP.",
        targetNeed: "Stockage sécurisé de credentials.",
        tags: ["Sécurité", "Managé", "Serverless"]
    },
    security_vault: { 
        name: "HashiCorp Vault", 
        cost: 180, 
        maintenance: 6, 
        tier: 'security', 
        provider: "VM", 
        desc: "Serveur de gestion de secrets auto-hébergé sur VM. Mitige l'incident de Fuite de secrets.", 
        concept: "Vault offre des fonctionnalités de cryptographie avancées mais sa haute disponibilité sur VM est délicate.",
        functionSummary: "Serveur de secrets multi-cloud.",
        targetNeed: "Chiffrement et secrets dynamiques.",
        tags: ["Sécurité", "IaaS", "Manuel"]
    },
    security_iam: { 
        name: "IAM Security Rules", 
        cost: 140, 
        maintenance: 3, 
        tier: 'security', 
        provider: "GCP", 
        desc: "Politiques d'accès IAM fines. Mitige l'incident d'Exploit IAM.", 
        concept: "Identity and Access Management applique le principe du moindre privilège aux identités de l'infrastructure.",
        functionSummary: "Politiques de sécurité d'identités.",
        targetNeed: "Moindre privilège d'accès aux APIs.",
        tags: ["Sécurité", "Configuration", "Natif"]
    },
    cicd_gitops: { 
        name: "GitOps (ArgoCD)", 
        cost: 180, 
        maintenance: 4, 
        tier: 'cicd', 
        provider: "VM", 
        desc: "Pipeline de déploiement continu GitOps. Réduit de 50% le warmup des clusters GKE.", 
        concept: "ArgoCD synchronise l'état désiré de Git avec l'état réel du cluster K8s de façon continue.",
        functionSummary: "Synchronisation Git vers Cluster.",
        targetNeed: "Déploiement déclaratif automatique.",
        tags: ["DevOps", "GitOps", "Automatisation"]
    },
    monitoring_cloudmonitoring: { 
        name: "Cloud Monitoring", 
        cost: 160, 
        maintenance: 3, 
        tier: 'monitoring', 
        provider: "GCP", 
        desc: "Outil natif d'observabilité GCP. Divise par 2 le délai de scaling du Cloud Run.", 
        concept: "Cloud Monitoring collecte logs, métriques et traces de façon intégrée dans la console GCP.",
        functionSummary: "Collecteur de logs et métriques natif.",
        targetNeed: "Observabilité intégrée GCP.",
        tags: ["Observabilité", "Natif", "Serverless"]
    },
    monitoring_prometheus: { 
        name: "Prometheus / Grafana", 
        cost: 150, 
        maintenance: 5, 
        tier: 'monitoring', 
        provider: "VM", 
        desc: "Suite de monitoring open-source sur VM dédiée. Divise par 2 le délai d'autoscaling.", 
        concept: "Prometheus extrait les métriques par pull et Grafana les affiche. Demande une VM de stockage volumineuse.",
        functionSummary: "Système de monitoring open-source.",
        targetNeed: "Visualisation customisée de métriques.",
        tags: ["Observabilité", "IaaS", "Manuel"]
    },
    monitoring_trace: { 
        name: "OpenTelemetry Trace", 
        cost: 220, 
        maintenance: 4, 
        tier: 'monitoring', 
        provider: "GCP", 
        desc: "Outil de traçage distribué des requêtes. Réduit de 10% la latence applicative générale.", 
        concept: "Cloud Trace ou OpenTelemetry tracent le cycle de vie d'une requête HTTP d'un service à un autre.",
        functionSummary: "Traçage distribué APM.",
        targetNeed: "Détecter les goulots d'étranglement.",
        tags: ["Observabilité", "Tracing", "Performance"]
    },
 
    // AI & CHAOS
    ai_vertex: { 
        name: "Vertex AI Gateway", 
        cost: 300, 
        maintenance: 12, 
        latencyOverhead: 25, 
        tier: 'ai', 
        provider: "GCP", 
        desc: "Passerelle managée vers les LLM Gemini. Augmente les revenus de +25%. Latence +25ms.", 
        concept: "Vertex AI Gateway sécurise et orchestre les requêtes vers l'API Vertex AI avec rate-limiting natif.",
        functionSummary: "Passerelle managée d'APIs IA.",
        targetNeed: "Intégration facilitée de modèles LLM.",
        tags: ["IA", "Gateway", "Managé"]
    },
    ai_bigquery: { 
        name: "BigQuery Analytics", 
        cost: 350, 
        maintenance: 15, 
        tier: 'ai', 
        provider: "GCP", 
        desc: "Entrepôt de données analytique. Augmente les revenus de +15% et génère 60$ toutes les 30s.", 
        concept: "BigQuery est serverless et utilise un stockage colonnaire pour analyser des milliards de lignes en SQL.",
        functionSummary: "Entrepôt analytique de données (DW).",
        targetNeed: "Requêtes analytiques massives temps réel.",
        tags: ["Analytics", "Serverless", "SQL"]
    },
    chaos_mesh: { 
        name: "Chaos Mesh Daemon", 
        cost: 120, 
        maintenance: 2, 
        tier: 'chaos', 
        provider: "GCP", 
        desc: "Agent de Chaos Engineering. Accélère la vitesse de récupération du SLA de 15%.", 
        concept: "Injecter des pannes en production permet de tester la résilience et d'optimiser les automatismes de reprise.",
        functionSummary: "Injecteur de pannes (Chaos Engineering).",
        targetNeed: "Validation proactive de résilience.",
        tags: ["DevOps", "Chaos", "Fiabilité"]
    }
};

const SVG_ICONS = {
    users: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="8" r="4" fill="#4285F4"/><path d="M18 21a6 6 0 0 0-12 0h12z" fill="#34A853"/></svg>`,
    cdn: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="9" stroke="#4285F4" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#FBBC05"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#EA4335" stroke-width="2" stroke-linecap="round"/><path d="M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="#34A853" stroke-width="2" stroke-linecap="round"/></svg>`,
    cdn_varnish: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect width="24" height="24" rx="4" fill="#3FBDC4"/><path d="M6 6h3l3 8 3-8h3l-4.5 12h-3L6 6z" fill="white"/></svg>`,
    waf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L4 5v6c0 5.25 3.42 10.15 8 11 4.58-.85 8-5.75 8-11V5l-8-3z" fill="#4285F4"/><path d="M12 3.5v16c3.5-.8 6.5-4.8 6.5-9V6.2L12 3.5z" fill="#34A853"/><path d="M12 8.5v5.5l-3 1.5 1-4.5-3.5-3 4.5-.5L12 8.5z" fill="#FBBC05"/></svg>`,
    waf_modsec: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect width="24" height="24" rx="4" fill="#334155"/><path d="M12 5L6 7v5c0 4 2.5 7.5 6 8.5 3.5-1 6-4.5 6-8.5V7l-6-2z" fill="#EF4444"/><path d="M12 8v5M10 11h4" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
    lb_global: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="10" stroke="#4285F4" stroke-width="2" fill="#4285F4" fill-opacity="0.1"/><path d="M12 4v16M4 12h16" stroke="#EA4335" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="#34A853"/><path d="M8 8l8 8M16 8l-8 8" stroke="#FBBC05" stroke-width="1.5"/></svg>`,
    lb_regional: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="10" stroke="#4285F4" stroke-width="2" fill="#4285F4" fill-opacity="0.1"/><path d="M12 4v16M4 12h16" stroke="#4285F4" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#FBBC05"/></svg>`,
    lb_haproxy: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect width="24" height="24" rx="4" fill="#0079C1"/><path d="M6 6v12h3v-4.5h6V18h3V6h-3v4.5H9V6H6z" fill="white"/><path d="M12 12c1.5 0 2.5-1 2.5-2.5S13.5 7 12 7H9v5h3z" fill="#E31B23"/></svg>`,
    queue_pubsub: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="6" cy="18" r="3.5" fill="#34A853"/><circle cx="18" cy="18" r="3.5" fill="#EA4335"/><circle cx="12" cy="6" r="4.5" fill="#4285F4"/><path d="M12 10.5v4M12 14.5l-4 2.5M12 14.5l4 2.5" stroke="#4285F4" stroke-width="1.5"/></svg>`,
    queue_rabbitmq: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M7 19c-1 0-2-.5-2.5-1.5s-.3-2.2.3-3.2c.5-.7 1.2-1.3 2-1.8.8-2 .5-4.2-.7-6C5.5 5.5 5 4 5 3c0-1 1-1.5 2-1s2.5 2 3.5 3.5c1.2-.5 2.5-.5 3.7.2C15 4 16.5 2.5 17.5 2c1-.5 2 0 2 1 0 1-.5 2.5-1.1 3.5-.8 1.5-1.2 3.3-.8 5.2.8.5 1.5 1.1 2 1.8.6 1 .8 2.2.3 3.2S18 19 17 19H7z" fill="#FF6600"/><circle cx="10" cy="11" r="1.2" fill="white"/><circle cx="14" cy="11" r="1.2" fill="white"/></svg>`,
    queue_kafka: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="10" fill="#231F20"/><path d="M7 6v12h3v-4.5l3.5 4.5h4l-4.5-5.5 4.5-6.5h-4L10 11.5V6H7z" fill="white"/></svg>`,
    compute_run: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" fill="none"/><path d="M6 9l6-3 6 3v6l-6 3-6-3V9z" fill="none"/><path d="M3 13.5l6-3.5 6 3.5 6-3.5" stroke="#34A853" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 17l6-3.5 6 3.5 6-3.5" stroke="#4285F4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 10l6-3.5 6 3.5 6-3.5" stroke="#FBBC05" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    compute_gke: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L19.5 5.5V13.5L12 21L4.5 13.5V5.5L12 2Z" fill="#326CE5"/><path d="M12 5.5L17 7.8V12.2L12 16.5L7 12.2V7.8L12 5.5Z" fill="white"/><circle cx="12" cy="11" r="2.5" fill="#326CE5"/><line x1="12" y1="5.5" x2="12" y2="8.5" stroke="#326CE5" stroke-width="1.5"/><line x1="7" y1="12.2" x2="9.5" y2="11" stroke="#326CE5" stroke-width="1.5"/><line x1="17" y1="12.2" x2="14.5" y2="11" stroke="#326CE5" stroke-width="1.5"/></svg>`,
    compute_vm: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L20.66 7v10L12 22 3.34 17V7L12 2z" fill="#4285F4"/><path d="M12 5.5L17.63 8.75v6.5L12 18.5 6.37 15.25v-6.5L12 5.5z" fill="white"/><rect x="9" y="8" width="6" height="2" rx="0.5" fill="#4285F4"/><rect x="9" y="11" width="6" height="2" rx="0.5" fill="#4285F4"/><rect x="9" y="14" width="6" height="2" rx="0.5" fill="#4285F4"/></svg>`,
    compute_functions: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L4 12.5h7.5V22l8-10.5h-7.5L13 2z" fill="url(#funcGrad)"/><defs><linearGradient id="funcGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#34A853"/><stop offset="50%" stop-color="#4285F4"/><stop offset="100%" stop-color="#4285F4"/></linearGradient></defs></svg>`,
    db_master: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2C6.48 2 2 3.8 2 6v12c0 2.2 4.48 4 10 4s10-1.8 10-4V6c0-2.2-4.48-4-10-4z" fill="#4285F4" fill-opacity="0.2"/><ellipse cx="12" cy="6" rx="10" ry="4" fill="#4285F4"/><path d="M22 6v6c0 2.2-4.48 4-10 4S2 14.2 2 12V6" stroke="#4285F4" stroke-width="2"/><path d="M22 12v6c0 2.2-4.48 4-10 4S2 20.2 2 18v-6" stroke="#4285F4" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#FBBC05"/></svg>`,
    db_spanner: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/><path d="M2 7v10l10 5V12L2 7z" fill="#34A853"/><path d="M22 7v10l-10 5V12l10-5z" fill="#FBBC05"/><path d="M12 12l-6-3 6-3 6 3-6 3z" fill="white" fill-opacity="0.3"/></svg>`,
    db_sql_postgres: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2C7 2 5 5 4 8c-1 3-1 6 2 8 1.5 1 3 0.5 4 0h1c0.5 1 1 2 2.5 2.5 1 .3 2.5.5 3.5-.5.5-.5 1-1.5 1-2.5 2-1 3-3.5 3-5.5s-1.5-5-5-5c-2.5 0-3.5 1-4.5 1.5C12 3.5 13 2 12 2z" fill="#336791"/><path d="M6 10c0-1.5 1.5-2.5 3-2.5s2.5 1 2.5 2.5S10 12.5 8.5 12.5 6 11.5 6 10z" fill="white"/><circle cx="9" cy="10" r="1" fill="#336791"/><path d="M4 9c-.5.5-1 1-1.5.5s-.5-1.5 0-2 1-.5 1.5.5z" fill="#D3D3D3"/></svg>`,
    db_postgres_vm: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L20.66 7v10L12 22 3.34 17V7L12 2z" fill="#64748B" fill-opacity="0.2" stroke="#64748B" stroke-width="1"/><g transform="translate(3, 3) scale(0.75)"><path d="M12 2C7 2 5 5 4 8c-1 3-1 6 2 8 1.5 1 3 0.5 4 0h1c0.5 1 1 2 2.5 2.5 1 .3 2.5.5 3.5-.5.5-.5 1-1.5 1-2.5 2-1 3-3.5 3-5.5s-1.5-5-5-5c-2.5 0-3.5 1-4.5 1.5C12 3.5 13 2 12 2z" fill="#336791"/><path d="M6 10c0-1.5 1.5-2.5 3-2.5s2.5 1 2.5 2.5S10 12.5 8.5 12.5 6 11.5 6 10z" fill="white"/><circle cx="9" cy="10" r="1" fill="#336791"/><path d="M4 9c-.5.5-1 1-1.5.5s-.5-1.5 0-2 1-.5 1.5.5z" fill="#D3D3D3"/></g></svg>`,
    db_redis: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L3 6l9 4 9-4-9-4z" fill="#D82C20"/><path d="M3 8l9 4 9-4M3 10.5l9 4 9-4" stroke="#a01a10" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 7v3.5l9 4 9-4V7l-9 4-9-4z" fill="#A31F15"/><path d="M3 11.5V15l9 4 9-4v-3.5l-9 4-9-4z" fill="#7C150E"/></svg>`,
    db_redis_vm: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L20.66 7v10L12 22 3.34 17V7L12 2z" fill="#64748B" fill-opacity="0.2" stroke="#64748B" stroke-width="1"/><g transform="translate(3, 3) scale(0.75)"><path d="M12 2L3 6l9 4 9-4-9-4z" fill="#D82C20"/><path d="M3 8l9 4 9-4M3 10.5l9 4 9-4" stroke="#a01a10" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 7v3.5l9 4 9-4V7l-9 4-9-4z" fill="#A31F15"/><path d="M3 11.5V15l9 4 9-4v-3.5l-9 4-9-4z" fill="#7C150E"/></g></svg>`,
    db_gcs: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect x="4" y="6" width="16" height="12" rx="1" stroke="#4285F4" stroke-width="2"/><path d="M4 9h16" stroke="#EA4335" stroke-width="2"/><path d="M4 12h16" stroke="#FBBC05" stroke-width="2"/><path d="M4 15h16" stroke="#34A853" stroke-width="2"/><path d="M9 2h6v4H9V2z" fill="#4285F4"/></svg>`,
    security_secretmanager: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect x="5" y="10" width="14" height="11" rx="2" fill="#4285F4"/><path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="#4285F4" stroke-width="2.5"/><circle cx="12" cy="15" r="2" fill="#FBBC05"/><path d="M12 17v2" stroke="#FBBC05" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    security_iam: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" fill="#4285F4"/><circle cx="12" cy="9" r="3" fill="white"/><path d="M8 16c0-2.5 2-4 4-4s4 1.5 4 4v1H8v-1z" fill="white"/></svg>`,
    security_vault: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect width="24" height="24" rx="4" fill="#000000"/><path d="M12 4l6 3.5v9L12 20l-6-3.5v-9L12 4z" fill="#808080"/><path d="M12 4v8l6-3.5L12 4z" fill="#A9A9A9"/><path d="M12 12l-6-3.5V17l6 3L12 12z" fill="#696969"/><path d="M12 12l6-3.5V17l-6 3v-6.5z" fill="#D3D3D3"/></svg>`,
    cicd_gitops: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="10" fill="#EF4444"/><path d="M12 4a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5L7 16h2l1-2 2 1 2-1 1 2h2l-1.5-3.5c1-1 1.5-2 1.5-3.5a5 5 0 0 0-5-5z" fill="white"/><circle cx="10.5" cy="8.5" r="1" fill="#EF4444"/><circle cx="13.5" cy="8.5" r="1" fill="#EF4444"/></svg>`,
    monitoring_cloudmonitoring: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><circle cx="12" cy="12" r="10" stroke="#4285F4" stroke-width="2"/><path d="M6 14h2v4H6z" fill="#FBBC05"/><path d="M10 10h2v8h-2z" fill="#EA4335"/><path d="M14 6h2v12h-2z" fill="#34A853"/><path d="M18 12h2v6h-2z" fill="#4285F4"/></svg>`,
    monitoring_prometheus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#E6522C" fill-opacity="0.1"/><path d="M12 4c-3.5 0-5 2.5-5 5.5 0 2 1 3.5 2 4.5C8.5 16 9 18 12 20c3-2 3.5-4 3-6 1-1 2-2.5 2-4.5C17 6.5 15.5 4 12 4z" fill="#E6522C"/><path d="M12 8c-2 0-3 1.5-3 3.5 0 1 .5 2 1 2.5C9.5 15 10 16 12 18c2-2 2.5-3 2-4 .5-.5 1-1.5 1-2.5C15 9.5 14 8 12 8z" fill="#FFC107"/></svg>`,
    monitoring_trace: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M3 5h12" stroke="#4285F4" stroke-width="3" stroke-linecap="round"/><path d="M7 10h14" stroke="#EA4335" stroke-width="3" stroke-linecap="round"/><path d="M5 15h10" stroke="#FBBC05" stroke-width="3" stroke-linecap="round"/><path d="M9 20h8" stroke="#34A853" stroke-width="3" stroke-linecap="round"/></svg>`,
    ai_vertex: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L2 9.5L12 17L22 9.5L12 2z" fill="#4285F4"/><path d="M2 9.5L12 22v-5L2 9.5z" fill="#34A853"/><path d="M22 9.5L12 22v-5l10-7.5z" fill="#FBBC05"/><circle cx="12" cy="9.5" r="3.5" fill="white"/></svg>`,
    ai_bigquery: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#4285F4" fill-opacity="0.2"/><path d="M12 2L3 7l9 5 9-5-9-5z" fill="#4285F4"/><path d="M3 12h18M3 17h18" stroke="#4285F4" stroke-width="2"/><circle cx="14" cy="13" r="3" stroke="#FBBC05" stroke-width="2" fill="white"/><line x1="16" y1="15" x2="19" y2="18" stroke="#FBBC05" stroke-width="2"/></svg>`,
    chaos_mesh: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svg-icon"><rect width="24" height="24" rx="4" fill="#111827"/><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" stroke="#EF4444" stroke-width="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="#EF4444" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#EF4444"/></svg>`
};

const nodeImages = {};

function preloadNodeImages(callback) {
    const keys = Object.keys(SVG_ICONS);
    let loadedCount = 0;
    
    if (keys.length === 0) {
        if (callback) callback();
        return;
    }
    
    keys.forEach(key => {
        let svgString = SVG_ICONS[key];
        if (svgString && !svgString.includes('xmlns=')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        const img = new Image();
        img.onload = () => {
            nodeImages[key] = img;
            loadedCount++;
            if (loadedCount === keys.length) {
                if (callback) callback();
            }
        };
        img.onerror = (err) => {
            console.error('Error loading SVG image for key:', key, err);
            loadedCount++;
            if (loadedCount === keys.length) {
                if (callback) callback();
            }
        };
        img.src = url;
    });
}

const TIER_TO_CATEGORY = {
    wan: 'network',
    lb: 'network',
    queue: 'network',
    compute: 'compute',
    db: 'data',
    security: 'ops',
    cicd: 'ops',
    monitoring: 'ops',
    ai: 'ai_chaos',
    chaos: 'ai_chaos'
};

function buildCatalogUI() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    
    const zoneColors = {
        wan: "#00f0ff",
        security: "#ff00ff",
        lb: "#ff007f",
        cicd: "#8a2be2",
        queue: "#ff7f00",
        monitoring: "#ffd700",
        compute: "#39ff14",
        ai: "#1e90ff",
        db: "#daa520",
        chaos: "#ff1e1e"
    };
    
    let html = '';
    
    Object.keys(COMPONENT_METRICS).forEach(key => {
        const metrics = COMPONENT_METRICS[key];
        const category = TIER_TO_CATEGORY[metrics.tier] || 'network';
        const svgContent = SVG_ICONS[key] || '';
        const zoneColor = zoneColors[metrics.tier] || '#00f0ff';
        
        html += `
            <div class="catalog-card compact" draggable="true" data-comp-type="${key}" data-category="${category}" data-zone="${metrics.tier}" style="--zone-color: ${zoneColor};">
                <div class="compact-icon-container">
                    ${svgContent}
                </div>
                <div class="compact-details">
                    <span class="compact-name">${metrics.name}</span>
                    <span class="compact-price">${metrics.cost} $</span>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

const state = {
    gameStarted: false,
    gameOver: false,
    victory: false,
    gameSpeed: 0, // 0: pause, 1: x1, 2: x2
    previousActiveSpeed: 1,
    
    budget: 1000,
    time: 0,
    status: 'NOMINAL', // NOMINAL, INCIDENT
    trust: 100,
    uiSettings: {
        showPerformance: true,
        showLoad: true,
        showTooltips: true
    },
    
    // Cooldowns and active emergency options
    actions: {
        waf: { active: false, activeTimer: 0, cooldown: 0, maxCooldown: 30, duration: 12 },
        dbOpt: { cooldown: 0, maxCooldown: 25 }
    },
    
    // Cooldown post-incident (en ticks de simulation)
    chaosCooldown: 0,
    
    // Drag and Drop state helpers
    dragOverTier: null,
    
    // Zone de surbrillance
    highlightedZone: null,
    highlightedZoneTimer: 0,
    
    // Mode Tutoriel
    isTutorial: false,
    tutorialStep: 0,
    
    // Contracts
    contracts: [],
    lastFinancials: {},
    lastNetworkDetails: {}
};

// --- DYNAMIC MULTI-INFRASTRUCTURE CONFIGURATION (Object.defineProperty Overrides) ---
state.activeContractId = 'startup';

const fallbackState = {
    infrastructure: { lbAlgo: 'round-robin', cdnActive: false, cdnCost: 150, cdnMaintenance: 2, components: [] },
    sla: 100.00,
    qps: 0,
    latency: 45,
    baseLatency: 45,
    queueSize: 0,
    activeEvents: [],
    slaWindow: Array(20).fill(1.0),
    slaWindowIndex: 0,
    victoryHoldTimer: 0,
    gracePeriodTimer: 0,
    marketingFlashActive: false,
    marketingFlashTimer: 0,
    marketingFlashCooldown: 0,
    marketingGrowthActive: false
};

const getActiveContract = () => {
    if (!state.contracts || state.contracts.length === 0) return null;
    return state.contracts.find(x => x.id === state.activeContractId);
};

const dynamicProperties = [
    'infrastructure', 'sla', 'qps', 'latency', 'baseLatency', 'queueSize', 
    'activeEvents', 'slaWindow', 'slaWindowIndex', 'victoryHoldTimer', 'gracePeriodTimer',
    'marketingFlashActive', 'marketingFlashTimer', 'marketingFlashCooldown', 'marketingGrowthActive'
];

dynamicProperties.forEach(prop => {
    Object.defineProperty(state, prop, {
        get() {
            const c = getActiveContract();
            if (c) {
                if (c[prop] === undefined) {
                    if (prop === 'slaWindow') c[prop] = Array(20).fill(1.0);
                    else if (prop === 'activeEvents') c[prop] = [];
                    else if (prop === 'infrastructure') {
                        c[prop] = {
                            lbAlgo: 'round-robin',
                            cdnActive: false,
                            cdnCost: 150,
                            cdnMaintenance: 2,
                            components: []
                        };
                    }
                    else if (prop.endsWith('Active')) c[prop] = false;
                    else if (prop.endsWith('Timer') || prop.endsWith('Cooldown') || prop === 'slaWindowIndex' || prop === 'queueSize' || prop === 'qps') c[prop] = 0;
                    else if (prop === 'sla') c[prop] = 100.0;
                    else if (prop === 'latency' || prop === 'baseLatency') c[prop] = 45;
                }
                return c[prop];
            }
            return fallbackState[prop];
        },
        set(val) {
            const c = getActiveContract();
            if (c) {
                c[prop] = val;
            } else {
                fallbackState[prop] = val;
            }
        },
        configurable: true,
        enumerable: true
    });
});


// --- CONSTANTS ---
const TICK_RATE_MS = 1333;
const CANVAS_FPS = 60;

// --- UTILITIES & FORMATTING ---
function formatNumber(num) {
    return Math.floor(num).toLocaleString('fr-FR');
}

function logMessage(title, desc, type = 'info') {
    const container = document.getElementById('log-container');
    if (!container) return;
    
    // Normalisation du type pour le code couleur demandé
    let normalizedType = 'info'; // Bleu (info) par défaut
    if (type === 'danger' || type === 'incident' || type === 'critical') {
        normalizedType = 'danger'; // Rouge (incident)
    } else if (type === 'warning' || type === 'event') {
        normalizedType = 'warning'; // Orange (evenement)
    } else if (type === 'green' || type === 'success' || type === 'resolution') {
        normalizedType = 'green'; // Vert (resolution)
    } else if (type === 'security') {
        normalizedType = 'security'; // Violet (sécurité)
    }
    
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    
    const logItem = document.createElement('div');
    logItem.className = `incident-item ${normalizedType}`;
    logItem.innerHTML = `
        <div class="incident-header">
            <span class="incident-title">${title}</span>
            <span class="incident-time">${timeStr}</span>
        </div>
        <p class="incident-desc">${desc}</p>
    `;
    
    container.insertBefore(logItem, container.firstChild);
    
    while (container.children.length > 30) {
        container.removeChild(container.lastChild);
    }
}

// --- FLOATING GAME NOTIFICATIONS SYSTEM ---
state.temporaryNotifications = [];

function addTemporaryNotification(title, desc, type, durationMs = 5000) {
    const notif = {
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        title: title,
        desc: desc,
        type: type, // 'green' ou 'info' ou 'danger' ou 'warning'
        timestamp: Date.now(),
        durationMs: durationMs
    };
    state.temporaryNotifications.push(notif);
    updateGameNotificationsDOM();
    
    setTimeout(() => {
        state.temporaryNotifications = state.temporaryNotifications.filter(n => n.id !== notif.id);
        updateGameNotificationsDOM();
    }, durationMs);
}

function updateGameNotificationsDOM() {
    const container = document.getElementById('game-notifications-container');
    if (!container) return;
    
    let html = '';
    
    // 1. Ajouter les événements actifs de la simulation (persistants) de TOUS les contrats signés
    state.contracts.forEach(c => {
        if (c.signed && c.activeEvents) {
            c.activeEvents.forEach(e => {
                let type = 'danger'; // Rouge par défaut (degradation)
                let icon = '🚨';
                let desc = '';
                
                if (e.type === 'UNICORN') {
                    type = 'warning'; // Orange
                    icon = '🦄';
                    desc = `Pic de trafic inattendu (+100 QPS) sur ${c.name}.`;
                } else if (e.type === 'DDOS') {
                    desc = `Attaque DDoS sur le Load Balancer de ${c.name}. Activez le WAF [W].`;
                    icon = '🛡️';
                } else if (e.type === 'FIBER_CUT') {
                    desc = `Coupure de fibre sur ${c.name}. Latence +220ms. CDN amortit l'impact.`;
                    icon = '🔌';
                } else if (e.type === 'DB_LOCK') {
                    desc = `Deadlock SQL transactionnel sur ${c.name}. Lancez le Vacuum DB [D].`;
                    icon = '🗄️';
                } else if (e.type === 'CREDENTIALS_LEAK') {
                    desc = `Secrets exposés publiquement sur ${c.name}. Mitigé par Vault.`;
                    icon = '🔑';
                } else if (e.type === 'CONFIG_EXPLOIT') {
                    desc = `Escalade de privilèges sur ${c.name}. Mitigé par les règles IAM.`;
                    icon = '⚙️';
                } else if (e.type === 'DNS_ATTACK') {
                    desc = `Attaque par empoisonnement DNS sur ${c.name}. Mitigé par Anycast ou WAF.`;
                    icon = '🌐';
                } else if (e.type === 'BRUTE_FORCE') {
                    desc = `Tentatives de brute force SSH sur ${c.name}. Mitigé par Secret Manager ou Vault.`;
                    icon = '🔑';
                } else if (e.type === 'DISK_FULL') {
                    desc = `Espace disque plein sur la base Postgres de ${c.name}. Exécutez Vacuum [D].`;
                    icon = '💾';
                } else if (e.type === 'ZONE_OUTAGE') {
                    desc = `Panne de zone physique sur ${c.name}. VM et DB Postgres uniques bridées à 20%.`;
                    icon = '💥';
                } else {
                    desc = `Incident système actif sur l'infrastructure de ${c.name}.`;
                    icon = '🔥';
                }
                
                if (e.level === 'securite') {
                    type = 'security';
                    icon = '🔒';
                } else if (e.level === 'alerte') {
                    type = 'warning';
                    icon = '⚠️';
                }
                
                let levelBadge = '';
                if (e.level === 'securite') {
                    levelBadge = `<span class="badge-tag level-security" style="background: #a855f7; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: bold; margin-left: 5px;">🔒 Sécurité</span>`;
                } else if (e.level === 'alerte') {
                    levelBadge = `<span class="badge-tag level-warning" style="background: #f97316; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: bold; margin-left: 5px;">⚠️ Alerte</span>`;
                } else {
                    levelBadge = `<span class="badge-tag level-danger" style="background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: bold; margin-left: 5px;">🚨 Dégradation</span>`;
                }
                
                let timerText = '';
                if (e.graceTimer > 0) {
                    timerText = `⏳ Grâce: ${e.graceTimer}s`;
                } else {
                    timerText = `⏳ ${e.durationRemaining}s`;
                }
                
                html += `
                    <div class="game-notif-card game-notif-${type}">
                        <div class="game-notif-header">
                            <span class="game-notif-title">${icon} ${e.name} [${c.name}]${levelBadge}</span>
                            <span class="game-notif-duration">${timerText}</span>
                        </div>
                        <div class="game-notif-desc">${desc}</div>
                    </div>
                `;
            });
        }
    });
    
    // 2. Ajouter les notifications temporaires (résolutions, etc.)
    state.temporaryNotifications.forEach(n => {
        let icon = 'ℹ️';
        let badge = 'INFO';
        if (n.type === 'green') {
            icon = '✅';
            badge = 'RÉSOLU';
        } else if (n.type === 'danger') {
            icon = '⚠️';
            badge = 'ALERTE';
        } else if (n.type === 'warning') {
            icon = '⚡';
            badge = 'EVENT';
        }
        
        html += `
            <div class="game-notif-card game-notif-${n.type}">
                <div class="game-notif-header">
                    <span class="game-notif-title">${icon} ${n.title}</span>
                    <span class="game-notif-badge">${badge}</span>
                </div>
                <div class="game-notif-desc">${n.desc}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    preloadNodeImages(() => {
        buildCatalogUI();
        initCanvas();
        resetGameState();
        initUI();
        
        // Start animation loop (always runs for UI rendering and particles)
        requestAnimationFrame(renderCanvasFrame);
    });
});

// --- UI SETUP & EVENT BINDING ---
let selectedComponentId = null;

function initUI() {
    // 1. Drag & Drop HTML5 et Survol d'inspection sur le Catalogue de composants
    document.querySelectorAll('.catalog-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.getAttribute('data-comp-type'));
        });
        
        // Survol pour l'inspection didactique
        card.addEventListener('mouseenter', () => {
            const compType = card.getAttribute('data-comp-type');
            const metrics = COMPONENT_METRICS[compType];
            if (metrics) {
                // Mettre à jour le logo géant
                const logoContainer = document.getElementById('inspector-logo-container');
                if (logoContainer) {
                    let svg = SVG_ICONS[compType] || '';
                    svg = svg.replace(/width="24"|width='24'/g, 'width="64"').replace(/height="24"|height='24'/g, 'height="64"');
                    logoContainer.innerHTML = svg;
                }
                
                // Mettre à jour les éléments du panneau d'inspection
                document.getElementById('inspector-title').textContent = metrics.name;
                
                const providerBadge = document.getElementById('inspector-provider');
                providerBadge.textContent = metrics.provider;
                providerBadge.className = 'inspector-provider ' + (metrics.provider === 'GCP' ? 'gcp' : 'tierce');
                
                document.getElementById('inspector-desc').textContent = metrics.desc || "Pas de description disponible.";
                
                // Configurer les statistiques
                document.getElementById('ins-cost').textContent = `${metrics.cost} $`;
                document.getElementById('ins-maint').textContent = `${metrics.maintenance} $/s`;
                
                let capacityVal = 'N/A';
                if (metrics.maxQps) capacityVal = `${metrics.maxQps} QPS`;
                else if (metrics.maxQueueSize) capacityVal = `${metrics.maxQueueSize} Req (Queue)`;
                document.getElementById('ins-cap').textContent = capacityVal;
                
                let latencyVal = '0 ms';
                if (metrics.latencyOverhead) {
                    latencyVal = `${metrics.latencyOverhead > 0 ? '+' : ''}${metrics.latencyOverhead} ms`;
                }
                document.getElementById('ins-latency').textContent = latencyVal;
                
                // Nouveaux détails riches didactiques
                document.getElementById('ins-function').textContent = metrics.functionSummary || 'N/A';
                document.getElementById('ins-need').textContent = metrics.targetNeed || 'N/A';
                
                const tagsContainer = document.getElementById('ins-tags-container');
                tagsContainer.innerHTML = '';
                if (metrics.tags && metrics.tags.length > 0) {
                    metrics.tags.forEach(tag => {
                        const badge = document.createElement('span');
                        badge.className = 'badge-tag';
                        badge.textContent = tag;
                        tagsContainer.appendChild(badge);
                    });
                }
                document.getElementById('inspector-rich-details').style.display = 'flex';
                
                // Afficher le tableau de stats et le concept didactique
                document.getElementById('inspector-stats').style.display = 'grid';
                
                const conceptBadge = document.getElementById('inspector-concept');
                if (metrics.concept) {
                    conceptBadge.textContent = `Conseil GCP : ${metrics.concept}`;
                    conceptBadge.style.display = 'block';
                } else {
                    conceptBadge.style.display = 'none';
                }
            }
        });
        
        card.addEventListener('mouseleave', () => {
            // Rétablir l'état par défaut de la console d'inspection
            const logoContainer = document.getElementById('inspector-logo-container');
            if (logoContainer) logoContainer.innerHTML = '';
            
            document.getElementById('inspector-title').textContent = "Console d'inspection";
            const providerBadge = document.getElementById('inspector-provider');
            providerBadge.textContent = "SYS";
            providerBadge.className = "inspector-provider";
            document.getElementById('inspector-desc').textContent = "Survolez un composant du catalogue à droite pour inspecter ses caractéristiques et concepts GCP.";
            document.getElementById('inspector-stats').style.display = 'none';
            document.getElementById('inspector-concept').style.display = 'none';
            
            document.getElementById('ins-function').textContent = 'N/A';
            document.getElementById('ins-need').textContent = 'N/A';
            document.getElementById('ins-tags-container').innerHTML = '';
            document.getElementById('inspector-rich-details').style.display = 'none';
        });
    });
    
    // 2. Événements sur le Canvas pour le Drag & Drop
    const networkMap = document.getElementById('network-map');
    networkMap.addEventListener('dragover', (e) => {
        e.preventDefault();
        const rect = networkMap.getBoundingClientRect();
        const dragX = (e.clientX - rect.left) * (networkMap.width / rect.width);
        const dragY = (e.clientY - rect.top) * (networkMap.height / rect.height);
        const w = networkMap.width;
        const h = networkMap.height;
        
        // Déterminer la zone de surbrillance parmi les 10 rectangles (5x2)
        let targetTier = null;
        const col = Math.floor(dragX / (w * 0.20));
        const isUpper = dragY < h * 0.5;
        
        if (col === 0) {
            targetTier = isUpper ? 'wan' : 'security';
        } else if (col === 1) {
            targetTier = isUpper ? 'lb' : 'cicd';
        } else if (col === 2) {
            targetTier = isUpper ? 'queue' : 'monitoring';
        } else if (col === 3) {
            targetTier = isUpper ? 'compute' : 'ai';
        } else {
            targetTier = isUpper ? 'db' : 'chaos';
        }
        state.dragOverTier = targetTier;
    });
    
    networkMap.addEventListener('dragleave', () => {
        state.dragOverTier = null;
    });
    
    networkMap.addEventListener('dragend', () => {
        state.dragOverTier = null;
    });
    
    networkMap.addEventListener('drop', (e) => {
        e.preventDefault();
        const rect = networkMap.getBoundingClientRect();
        const dropX = (e.clientX - rect.left) * (networkMap.width / rect.width);
        const dropY = (e.clientY - rect.top) * (networkMap.height / rect.height);
        state.dragOverTier = null;
        
        const compType = e.dataTransfer.getData('text/plain');
        if (!compType) return;
        
        const metrics = COMPONENT_METRICS[compType];
        if (!metrics) return;
        
        const w = networkMap.width;
        const h = networkMap.height;
        let isTargetValid = false;
        
        let targetTier = null;
        const col = Math.floor(dropX / (w * 0.20));
        const isUpper = dropY < h * 0.5;
        
        if (col === 0) {
            targetTier = isUpper ? 'wan' : 'security';
        } else if (col === 1) {
            targetTier = isUpper ? 'lb' : 'cicd';
        } else if (col === 2) {
            targetTier = isUpper ? 'queue' : 'monitoring';
        } else if (col === 3) {
            targetTier = isUpper ? 'compute' : 'ai';
        } else {
            targetTier = isUpper ? 'db' : 'chaos';
        }
        
        if (metrics.tier === targetTier) {
            isTargetValid = true;
        }
        
        if (!isTargetValid) {
            logMessage("Drop invalide", `Ce composant doit être déposé dans la zone : ${metrics.tier.toUpperCase()}`, "warning");
            return;
        }
        
        if (state.budget < metrics.cost) {
            logMessage("Budget insuffisant", `L'achat de ${metrics.name} nécessite ${metrics.cost} $.`, "warning");
            return;
        }
        
        if (compType === 'db_spanner') {
            const spannerExists = state.infrastructure.components.some(c => c.type === 'db_spanner');
            if (spannerExists) {
                logMessage("Achat refusé", "Un cluster Cloud Spanner est déjà actif.", "warning");
                return;
            }
        }
        
        if (compType === 'lb_global' || compType === 'lb_regional') {
            // Un seul LB de chaque type ou un seul LB actif au total ?
            // Permettons de remplacer le LB existant. Si on achète un nouveau LB, on détruit l'ancien LB
            const oldLbIdx = state.infrastructure.components.findIndex(c => c.tier === 'lb');
            if (oldLbIdx !== -1) {
                const oldLb = state.infrastructure.components[oldLbIdx];
                logMessage("LB Remplacé", `Le Load Balancer ${oldLb.name} a été démantelé et remplacé.`, "info");
                state.infrastructure.components.splice(oldLbIdx, 1);
            }
        }
        
        // Achat
        state.budget -= metrics.cost;
        
        const newComp = {
            id: `${compType}_${Date.now()}`,
            type: compType,
            name: `${metrics.name} ${state.infrastructure.components.filter(c => c.type === compType).length + 1}`,
            tier: metrics.tier,
            maxQps: metrics.maxQps || 0,
            activeMaxQps: compType === 'compute_run' ? 50 : (compType === 'compute_gke' ? 150 : (metrics.maxQps || 0)),
            latencyOverhead: metrics.latencyOverhead || 0,
            load: 0,
            activeQps: 0,
            maintenance: metrics.maintenance,
            scalingTimer: 0,
            scaleDownTimer: 0,
            x: dropX,
            y: dropY
        };
        
        state.infrastructure.components.push(newComp);
        
        if (compType === 'db_spanner') {
            logMessage("Migration Spanner", "Cloud Spanner déployé. Vous pouvez maintenant démanteler le Postgres SQL Master dans la console de configuration.", "green");
        } else {
            logMessage("Achat Composant", `${newComp.name} provisionné et déployé dans la zone ${targetTier.toUpperCase()}.`, "info");
        }
        
        updateNodePositions();
        updateUIElements();
        renderContractsList();
        
        // Déclencheur tutoriel pour déploiement de composant
        checkTutorialTriggers('deploy_component', newComp);
    });
    
    // 3. Clic pour sélectionner un composant sur le Canvas
    networkMap.addEventListener('click', (e) => {
        const rect = networkMap.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (networkMap.width / rect.width);
        const clickY = (e.clientY - rect.top) * (networkMap.height / rect.height);
        
        // Vérifier d'abord le clic sur le bouton de suppression rapide (croix) du nœud sélectionné
        if (selectedComponentId && selectedComponentId !== 'lb') {
            const comp = state.infrastructure.components.find(c => c.id === selectedComponentId);
            if (comp) {
                const btnX = comp.x + comp.radius * 0.9;
                const btnY = comp.y - comp.radius * 0.9;
                const distBtn = Math.hypot(clickX - btnX, clickY - btnY);
                if (distBtn < 10) {
                    if (comp.type === 'db_master') {
                        const hasAlternativeDb = state.infrastructure.components.some(c => c.type === 'db_spanner' || c.type === 'db_sql_postgres');
                        if (!hasAlternativeDb) {
                            logMessage("Démantèlement bloqué", "Vous devez d'abord acheter Cloud Spanner ou Cloud SQL Postgres avant de pouvoir détruire le Master SQL Postgres d'origine.", "warning");
                            return;
                        }
                    }
                    sellComponent(comp.id);
                    return;
                }
            }
        }
        
        // Plus de clic LB "en dur" (le LB fait partie de components)
        // Clic Composants
        let clickedComp = null;
        state.infrastructure.components.forEach(c => {
            const dist = Math.hypot(clickX - c.x, clickY - c.y);
            if (dist < (c.radius || 18) + 12) {
                clickedComp = c;
            }
        });
        
        if (clickedComp) {
            selectComponent(clickedComp.id);
        } else {
            const isClickOnCanvas = e.target.id === 'network-map';
            if (isClickOnCanvas) {
                deselectComponent();
                
                // Détecter la zone cliquée sur le Canvas
                const w = networkMap.width;
                const h = networkMap.height;
                if (clickX >= 0 && clickX <= w && clickY >= 0 && clickY <= h) {
                    const col = Math.floor(clickX / (w * 0.20));
                    const isUpper = clickY < h * 0.5;
                    let clickedTier = null;
                    if (col === 0) clickedTier = isUpper ? 'wan' : 'security';
                    else if (col === 1) clickedTier = isUpper ? 'lb' : 'cicd';
                    else if (col === 2) clickedTier = isUpper ? 'queue' : 'monitoring';
                    else if (col === 3) clickedTier = isUpper ? 'compute' : 'ai';
                    else if (col === 4) clickedTier = isUpper ? 'db' : 'chaos';
                    
                    if (clickedTier) {
                        const category = TIER_TO_CATEGORY[clickedTier];
                        if (category) {
                            activateCatalogFilter(category);
                            state.highlightedZone = clickedTier;
                            state.highlightedZoneTimer = 30;
                        }
                    }
                }
            }
        }
    });

    // Emergency actions
    document.getElementById('btn-action-waf').addEventListener('click', triggerWaf);
    document.getElementById('btn-action-db-opt').addEventListener('click', triggerDbOptimization);
    
    // Visual toggles
    document.getElementById('view-btn-packets').addEventListener('click', (e) => toggleVisualMode('packets', e.target));
    document.getElementById('view-btn-heatmap').addEventListener('click', (e) => toggleVisualMode('heatmap', e.target));
    
    // Speed Controls
    document.getElementById('speed-btn-pause').addEventListener('click', () => setGameSpeed(0));
    document.getElementById('speed-btn-x1').addEventListener('click', () => setGameSpeed(1));
    document.getElementById('speed-btn-x2').addEventListener('click', () => setGameSpeed(2));
    
    // UI Filter Toggles
    const togglePerfBtn = document.getElementById('toggle-perf');
    if (togglePerfBtn) {
        togglePerfBtn.addEventListener('click', () => {
            state.uiSettings.showPerformance = !state.uiSettings.showPerformance;
            togglePerfBtn.classList.toggle('active', state.uiSettings.showPerformance);
        });
    }
    const toggleLoadBtn = document.getElementById('toggle-load');
    if (toggleLoadBtn) {
        toggleLoadBtn.addEventListener('click', () => {
            state.uiSettings.showLoad = !state.uiSettings.showLoad;
            toggleLoadBtn.classList.toggle('active', state.uiSettings.showLoad);
        });
    }
    const toggleTooltipsBtn = document.getElementById('toggle-tooltips');
    if (toggleTooltipsBtn) {
        toggleTooltipsBtn.addEventListener('click', () => {
            state.uiSettings.showTooltips = !state.uiSettings.showTooltips;
            toggleTooltipsBtn.classList.toggle('active', state.uiSettings.showTooltips);
        });
    }
    
    // Modal buttons
    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
        btnStartGame.addEventListener('click', startGame);
    }
    const btnRestartGame = document.getElementById('btn-restart-game');
    if (btnRestartGame) {
        btnRestartGame.addEventListener('click', restartGame);
    }
    
    // Tutorial button
    const btnTuto = document.getElementById('tutorial-btn');
    if (btnTuto) {
        btnTuto.addEventListener('click', () => {
            if (state.isTutorial) {
                if (state.tutorialStep === 0) {
                    state.tutorialStep = 1;
                    updateTutorialUI();
                } else if (state.tutorialStep === 5) {
                    state.isTutorial = false;
                    document.getElementById('tutorial-banner').style.display = 'none';
                    logMessage("Tutoriel Terminé", "Vous êtes maintenant en Simulation Libre. Bonne chance !", "green");
                    updateUIElements();
                }
            }
        });
    }
    
    // Catalog category tabs filtering
    document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            filterCatalog(tab);
        });
    });
    
    updateUIElements();
    renderContractsList();
}

function filterCatalog(category) {
    const cards = document.querySelectorAll('.catalog-card');
    const titles = document.querySelectorAll('.catalog-cat-title');
    
    cards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'all' || cardCat === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    titles.forEach(title => {
        const titleCat = title.getAttribute('data-category');
        if (category === 'all' || titleCat === category) {
            title.style.display = 'block';
        } else {
            title.style.display = 'none';
        }
    });
}

function activateCatalogFilter(category) {
    const tabs = document.querySelectorAll('.catalog-tab-btn');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    filterCatalog(category);
}

let visualMode = 'packets'; // 'packets' or 'heatmap'
function toggleVisualMode(mode, targetBtn) {
    visualMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');
    
    document.getElementById('overlay-node-title').innerText = mode === 'packets' ? 'Flux de requêtes réseau' : 'Analyse de charge thermique';
    document.getElementById('overlay-node-desc').innerText = mode === 'packets' 
        ? 'Visualisation en direct des paquets de données. Vert: Succès, Jaune: Latence critique, Rouge: Drop.'
        : 'Indicateur visuel de charge CPU/Capacité sur chaque nœud physique de l\'infrastructure.';
}

function startGame() {
    document.getElementById('onboarding-modal').style.display = 'none';
    state.gameStarted = true;
    
    // Start game in PAUSE mode by default to let player review UI
    setGameSpeed(0);
    
    logMessage("Début de Mission (Pause)", "Mission démarrée en mode PAUSE par défaut. Explorez l'interface, puis cliquez sur [▶ x1] pour lancer le trafic réseau !", "info");
}

function restartGame() {
    document.getElementById('game-end-modal').style.display = 'none';
    resetGameState();
    document.getElementById('onboarding-modal').style.display = 'flex';
}

let simInterval = null;
function setGameSpeed(speed) {
    state.gameSpeed = speed;
    
    // Clear old timer
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
    
    // Update active button state
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    
    const pauseBanner = document.getElementById('pause-banner');
    if (speed === 0) {
        document.getElementById('speed-btn-pause').classList.add('active');
        if (pauseBanner) pauseBanner.classList.add('visible');
        logMessage("Simulation en pause", "Le temps s'est arrêté.", "info");
    } else {
        if (pauseBanner) pauseBanner.classList.remove('visible');
        if (speed === 1) {
            document.getElementById('speed-btn-x1').classList.add('active');
            simInterval = setInterval(simulationTick, TICK_RATE_MS);
            logMessage("Simulation reprise (x1)", "Le temps s'écoule normalement.", "info");
        } else if (speed === 2) {
            document.getElementById('speed-btn-x2').classList.add('active');
            simInterval = setInterval(simulationTick, TICK_RATE_MS / 2); // twice as fast
            logMessage("Simulation accélérée (x2)", "Le temps défile deux fois plus vite.", "info");
        }
    }
}

function resetGameState() {
    state.gameStarted = false;
    state.gameOver = false;
    state.victory = false;
    state.gameSpeed = 0;
    state.budget = 1000;
    state.time = 0;
    state.trust = 100;
    state.uiSettings = {
        showPerformance: true,
        showLoad: true,
        showTooltips: true
    };
    state.activeContractId = 'startup';
    
    // Reset visual filter toggle buttons
    ['toggle-perf', 'toggle-load', 'toggle-tooltips'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add('active');
    });
    
    // Initialisation des statistiques pour le cockpit de fin de run
    state.stats = {
        maxBudget: 1000,
        maxQps: 0,
        incidentsCount: 0,
        actionsCount: 0,
        slaSum: 100,
        slaTicks: 1
    };
    
    // Deep clone template contracts avec leurs propres infrastructures et métriques
    state.contracts = CONTRACTS_TEMPLATE.map(c => {
        const isStartup = c.id === 'startup';
        const initialInfra = {
            lbAlgo: 'round-robin',
            cdnActive: false,
            cdnCost: 150,
            cdnMaintenance: 2,
            components: isStartup ? [
                {
                    id: 'lb_regional_initial_' + c.id,
                    type: 'lb_regional',
                    name: 'Regional HTTP LB',
                    tier: 'lb',
                    maxQps: 150,
                    activeMaxQps: 150,
                    latencyOverhead: 10,
                    load: 0,
                    activeQps: 0,
                    maintenance: 2,
                    x: 0,
                    y: 0
                },
                {
                    id: 'db_master_' + c.id,
                    type: 'db_master',
                    name: 'Postgres SQL Master',
                    tier: 'db',
                    maxQps: 150,
                    activeMaxQps: 150,
                    latencyOverhead: 0,
                    load: 0,
                    activeQps: 0,
                    maintenance: 8,
                    x: 0,
                    y: 0
                },
                {
                    id: 'compute_initial_1_' + c.id,
                    type: 'compute_run',
                    name: 'Cloud Run Instance 1',
                    tier: 'compute',
                    maxQps: 150,
                    activeMaxQps: 50,
                    latencyOverhead: 5,
                    load: 0,
                    activeQps: 0,
                    maintenance: 8,
                    scalingTimer: 0,
                    scaleDownTimer: 0,
                    x: 0,
                    y: 0
                }
            ] : []
        };
        
        return {
            ...c,
            signed: false,
            breachTimer: 0,
            currentQps: c.baseQps,
            currentRevenue: c.revenue,
            infrastructure: initialInfra,
            sla: 100.00,
            trust: 50.0,
            qps: 0,
            latency: 45,
            baseLatency: 45,
            queueSize: 0,
            activeEvents: [],
            slaWindow: Array(20).fill(1.0), // Fenêtre de SLA glissante réduite à 20 ticks !
            slaWindowIndex: 0,
            victoryHoldTimer: 0,
            gracePeriodTimer: 0,
            marketingFlashActive: false,
            marketingFlashTimer: 0,
            marketingFlashCooldown: 0,
            marketingGrowthActive: false
        };
    });
    
    // Définir le contrat actif par défaut
    state.activeContractId = 'startup';
    
    state.actions.waf.active = false;
    state.actions.waf.activeTimer = 0;
    state.actions.waf.cooldown = 0;
    state.actions.dbOpt.cooldown = 0;
    state.chaosCooldown = 0;
    state.temporaryNotifications = [];
    state.dragOverTier = null;
    
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
    
    // Clear logs
    const container = document.getElementById('log-container');
    if (container) {
        container.innerHTML = `
            <div class="incident-item info">
                <div class="incident-header">
                    <span class="incident-title">Système Démarré</span>
                    <span class="incident-time">INIT</span>
                </div>
                <p class="incident-desc">Plateforme Cloud multi-infrastructures initialisée. Sélectionnez un contrat pour bâtir son architecture.</p>
            </div>
        `;
    }
    
    // Reset speeds buttons UI
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    const pauseBtn = document.getElementById('speed-btn-pause');
    if (pauseBtn) pauseBtn.classList.add('active');
    
    deselectComponent();
    updateNodePositions();
    updateGameNotificationsDOM();
}

function selectComponent(id) {
    selectedComponentId = id;
    const panel = document.getElementById('config-panel');
    const nameEl = document.getElementById('config-comp-name');
    const statsEl = document.getElementById('config-comp-stats');
    const actionsEl = document.getElementById('config-comp-actions');
    const logoContainer = document.getElementById('config-comp-logo');
    
    panel.style.display = 'block';
    const inspector = document.getElementById('catalog-inspector');
    if (inspector) {
        inspector.style.display = 'none';
    }
    
    if (logoContainer) {
        let svg = '';
        if (id === 'lb') {
            svg = SVG_ICONS['lb_regional'] || '';
        } else {
            const comp = state.infrastructure.components.find(c => c.id === id);
            if (comp) {
                svg = SVG_ICONS[comp.type] || '';
            }
        }
        if (svg) {
            svg = svg.replace(/width="24"|width='24'/g, 'width="64"').replace(/height="24"|height='24'/g, 'height="64"');
            logoContainer.innerHTML = svg;
        } else {
            logoContainer.innerHTML = '';
        }
    }
    
    if (id === 'lb') {
        nameEl.innerText = "⚡ Anycast Load Balancer";
        
        const computes = state.infrastructure.components.filter(c => c.tier === 'compute');
        const cap = computes.reduce((acc, c) => acc + (c.activeMaxQps || c.maxQps), 0);
        const loadPercent = cap > 0 ? Math.round((state.qps / cap) * 100) : 0;
        
        statsEl.innerHTML = `
            <strong>Algorithme actif :</strong> ${state.infrastructure.lbAlgo.toUpperCase()}<br>
            <strong>Capacité Compute cumulée :</strong> ${cap} QPS<br>
            <strong>Taux de charge global :</strong> ${loadPercent}%<br>
            <strong>CDN Edge Cache :</strong> ${state.infrastructure.cdnActive ? 'Activé (-15ms latence)' : 'Désactivé'}
        `;
        
        actionsEl.innerHTML = `
            <label style="font-size:0.7rem; color:var(--color-muted); margin-bottom:0.2rem; display:block;">Algorithme d'aiguillage :</label>
            <select id="lb-algo-select" onchange="changeLbAlgo(this.value)" style="width:100%; margin-bottom:0.75rem;">
                <option value="round-robin" ${state.infrastructure.lbAlgo === 'round-robin' ? 'selected' : ''}>Round Robin (Cyclique)</option>
                <option value="least-conn" ${state.infrastructure.lbAlgo === 'least-conn' ? 'selected' : ''}>Least Connections (Intelligent)</option>
                <option value="fifo" ${state.infrastructure.lbAlgo === 'fifo' ? 'selected' : ''}>FIFO (Saturation nœud 1)</option>
            </select>
            
            <div>
                ${!state.infrastructure.cdnActive 
                    ? `<button class="btn" onclick="purchaseCdn()" style="width:100%;">Activer CDN Edge Cache (150 $)</button>`
                    : `<button class="btn btn-secondary" disabled style="width:100%;">CDN Edge Cache Actif (Maint. : 2 $/s)</button>`
                }
            </div>
        `;
    } else {
        const comp = state.infrastructure.components.find(c => c.id === id);
        if (!comp) return;
        
        let compTypeName = "";
        let statsDetails = "";
        let actionButtons = "";
        
        const metrics = COMPONENT_METRICS[comp.type] || { name: comp.name, cost: 0, maintenance: 0, maxQps: 150 };
        
        if (comp.type === 'db_master') {
            compTypeName = "Postgres SQL Master DB";
            statsDetails = `
                <strong>Type :</strong> Base de Données Principale (SQL)<br>
                <strong>Capacité :</strong> 150 QPS<br>
                <strong>Maintenance :</strong> 8 $/s<br>
                <strong>Charge SQL :</strong> ${Math.round((comp.load || 0) * 100)}%
            `;
            
            const hasAlternativeDb = state.infrastructure.components.some(c => c.type === 'db_spanner' || c.type === 'db_sql_postgres');
            actionButtons = `
                <button class="btn btn-danger" ${hasAlternativeDb ? '' : 'disabled'} onclick="sellComponent('${comp.id}')" style="width:100%;">
                    ${hasAlternativeDb ? 'Démanteler [Touche Suppr] (Vendre pour 100 $)' : 'Démantèlement bloqué'}
                </button>
                ${!hasAlternativeDb ? `<p style="font-size:0.65rem; color:var(--magenta); margin-top:0.25rem;">⚠️ Vous devez d'abord acheter Cloud Spanner ou Cloud SQL Postgres avant de pouvoir détruire le Master SQL Postgres d'origine.</p>` : `<p style="font-size:0.65rem; color:var(--color-muted); margin-top:0.5rem; text-align:center;">💡 Vous pouvez aussi le supprimer avec la touche <strong>Suppr</strong> ou via la croix rouge ✕ sur le schéma.</p>`}
            `;
        } else {
            compTypeName = metrics.name;
            const currentCap = comp.activeMaxQps || comp.maxQps;
            statsDetails = `
                <strong>ID :</strong> ${comp.id}<br>
                <strong>Capacité active :</strong> ${currentCap} QPS (Max: ${comp.maxQps} QPS)<br>
                <strong>Maintenance active :</strong> ${comp.maintenance} $/s<br>
                <strong>Charge active :</strong> ${Math.round((comp.load || 0) * 100)}%<br>
                ${metrics.latencyOverhead > 0 ? `<strong>Overhead Latence :</strong> +${metrics.latencyOverhead}ms` : '<strong>Latence :</strong> 0ms'}
            `;
            
            const refund = Math.floor(metrics.cost * 0.5);
            actionButtons = `
                <button class="btn btn-danger" onclick="sellComponent('${comp.id}')" style="width:100%;">
                    Démanteler [Touche Suppr] (Vendre pour ${refund} $)
                </button>
                <p style="font-size:0.65rem; color:var(--color-muted); margin-top:0.5rem; text-align:center;">💡 Vous pouvez aussi le supprimer avec la touche <strong>Suppr</strong> ou via la croix rouge ✕ sur le schéma.</p>
            `;
        }
        
        nameEl.innerText = `📦 ${compTypeName}`;
        statsEl.innerHTML = statsDetails;
        actionsEl.innerHTML = actionButtons;
    }
}

window.changeLbAlgo = function(algo) {
    state.infrastructure.lbAlgo = algo;
    logMessage("Configuration Load Balancer", `Algorithme de routage changé pour : ${algo.toUpperCase()}.`, "info");
    if (selectedComponentId === 'lb') selectComponent('lb');
};

window.purchaseCdn = function() {
    if (state.budget >= state.infrastructure.cdnCost) {
        state.budget -= state.infrastructure.cdnCost;
        state.infrastructure.cdnActive = true;
        logMessage("CDN Activé", "Réseau de diffusion de contenu déployé au plus proche des utilisateurs (-15ms de latence).", "info");
        updateUIElements();
        if (selectedComponentId === 'lb') selectComponent('lb');
    } else {
        logMessage("Budget insuffisant", "Il vous faut 150 $ pour activer le CDN.", "warning");
    }
};

window.sellComponent = function(id) {
    const idx = state.infrastructure.components.findIndex(c => c.id === id);
    if (idx !== -1) {
        const comp = state.infrastructure.components[idx];
        let refund = 0;
        if (comp.type === 'db_master') {
            const hasAlternativeDb = state.infrastructure.components.some(c => c.type === 'db_spanner' || c.type === 'db_sql_postgres');
            if (!hasAlternativeDb) {
                logMessage("Démantèlement bloqué", "Vous devez d'abord acheter Cloud Spanner ou Cloud SQL Postgres avant de pouvoir détruire le Master SQL Postgres d'origine.", "warning");
                return;
            }
            refund = 100;
        } else {
            const metrics = COMPONENT_METRICS[comp.type];
            if (metrics) refund = Math.floor(metrics.cost * 0.5);
        }
        
        state.budget += refund;
        state.infrastructure.components.splice(idx, 1);
        logMessage("Composant Démantelé", `Le composant ${comp.name} a été revendu. Récupération de +${refund} $.`, "info");
        
        deselectComponent();
        updateNodePositions();
        updateUIElements();
        renderContractsList();
    }
};

function deselectComponent() {
    selectedComponentId = null;
    document.getElementById('config-panel').style.display = 'none';
    const logoContainer = document.getElementById('config-comp-logo');
    if (logoContainer) logoContainer.innerHTML = '';
    const inspector = document.getElementById('catalog-inspector');
    if (inspector) {
        inspector.style.display = 'flex';
    }
}

function updateUIElements() {
    // Budget
    document.getElementById('budget-value').innerText = `${formatNumber(state.budget)} $`;
    
    // Tendance budgétaire temps réel
    const budgetTrend = document.getElementById('budget-trend');
    if (budgetTrend) {
        const netProfit = (state.lastFinancials && state.lastFinancials.netProfit) || 0;
        if (netProfit > 0) {
            budgetTrend.innerHTML = `▲ +${formatNumber(netProfit)} $/s`;
            budgetTrend.className = 'budget-trend-indicator gain';
        } else if (netProfit < 0) {
            budgetTrend.innerHTML = `▼ ${formatNumber(netProfit)} $/s`;
            budgetTrend.className = 'budget-trend-indicator loss';
        } else {
            budgetTrend.innerHTML = `▲ +0 $/s`;
            budgetTrend.className = 'budget-trend-indicator';
        }
    }
    
    // SLA
    const slaVal = document.getElementById('sla-value');
    slaVal.innerText = `${state.sla.toFixed(2)}%`;
    slaVal.className = 'metric-value';
    if (state.sla >= 99.9) slaVal.classList.add('good');
    else if (state.sla >= 99.0) slaVal.classList.add('warning');
    else slaVal.classList.add('danger');
    
    // Trust
    const trustVal = document.getElementById('trust-value');
    if (trustVal) {
        trustVal.innerText = `${Math.round(state.trust)}%`;
        trustVal.className = 'metric-value';
        if (state.trust >= 80) trustVal.classList.add('good');
        else if (state.trust >= 50) trustVal.classList.add('warning');
        else trustVal.classList.add('danger');
    }
    
    // QPS
    document.getElementById('qps-value').innerText = `${formatNumber(state.qps)} QPS`;
    
    // Latency
    const latencyVal = document.getElementById('latency-value');
    latencyVal.innerText = `${Math.round(state.latency)} ms`;
    latencyVal.className = 'metric-value';
    if (state.latency < 80) latencyVal.classList.add('good');
    else if (state.latency < 250) latencyVal.classList.add('warning');
    else latencyVal.classList.add('danger');
    
    // WAF Cooldown text
    const wafCooldownText = document.getElementById('cooldown-text-waf');
    const wafBtn = document.getElementById('btn-action-waf');
    const hasWaf = state.infrastructure.components.some(c => c.type === 'waf' || c.type === 'waf_modsec');

    if (!hasWaf) {
        wafCooldownText.innerText = `Requis`;
        wafBtn.disabled = true;
    } else if (state.actions.waf.active) {
        wafCooldownText.innerText = `ACTIF (${state.actions.waf.activeTimer}s)`;
        wafBtn.disabled = true;
    } else if (state.actions.waf.cooldown > 0) {
        wafCooldownText.innerText = `${state.actions.waf.cooldown}s CD`;
        wafBtn.disabled = true;
    } else {
        wafCooldownText.innerText = `Prêt`;
        wafBtn.disabled = false;
    }
    
    // DB Cooldown text
    const dbCooldownText = document.getElementById('cooldown-text-db-opt');
    const dbBtn = document.getElementById('btn-action-db-opt');
    if (state.actions.dbOpt.cooldown > 0) {
        dbCooldownText.innerText = `${state.actions.dbOpt.cooldown}s CD`;
        dbBtn.disabled = true;
    } else {
        dbCooldownText.innerText = `Prêt`;
        dbBtn.disabled = false;
    }
    
    // Global Status
    const statusBadge = document.getElementById('infra-status');
    if (state.status === 'NOMINAL') {
        statusBadge.innerText = 'Nominal';
        statusBadge.className = 'status-badge nominal';
    } else {
        statusBadge.innerText = 'Incident';
        statusBadge.className = 'status-badge incident';
    }
    
    // System time
    const timeSpan = document.getElementById('system-time');
    if (timeSpan) {
        timeSpan.innerText = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    }
    
    // Active contracts counts
    const activeCount = state.contracts.filter(c => c.signed).length;
    document.getElementById('active-contracts-count').innerText = `${activeCount} Client${activeCount > 1 ? 's' : ''}`;
    
    // Mettre à jour l'affichage de configuration en direct si sélectionné
    if (selectedComponentId) {
        selectComponent(selectedComponentId);
    }
    
    // Update KPI Tooltips
    updateKpiTooltips();
    
    // Update Cockpit Incidents
    updateActiveIncidentsPanel();
    
    // Rendre les onglets de projets GCP
    renderProjectTabs();
    
    // Mettre à jour le panneau d'objectifs dynamiques
    updateObjectivesPanel();
}

function updateActiveIncidentsPanel() {
    const container = document.getElementById('active-incidents-container');
    if (!container) return;
    
    const allIncidents = [];
    state.contracts.forEach(c => {
        if (c.signed && c.activeEvents) {
            c.activeEvents.forEach(e => {
                allIncidents.push({ event: e, contract: c });
            });
        }
    });
    
    if (allIncidents.length === 0) {
        container.innerHTML = `
            <div class="nominal-incident-card">
                ✓ NOMINAL : INFRASTRUCTURES STABLES
            </div>
        `;
        return;
    }
    
    let html = '';
    allIncidents.forEach(item => {
        const e = item.event;
        const c = item.contract;
        let desc = '';
        let icon = '🚨';
        
        if (e.type === 'DDOS') {
            desc = `Attaque volumétrique sur ${c.name}. Activez le WAF [W] ou déployez un WAF pour mitiger le trafic.`;
            icon = '🛡️';
        } else if (e.type === 'FIBER_CUT') {
            desc = `Coupure de fibre sur ${c.name}. Latence +220ms. Un CDN actif amortit l'impact.`;
            icon = '🔌';
        } else if (e.type === 'DB_LOCK') {
            desc = `Conflit transactionnel SQL sur ${c.name}. Déclenchez le Vacuum SQL [D] pour purger.`;
            icon = '🗄️';
        } else if (e.type === 'UNICORN') {
            desc = `Pic de trafic (+100 QPS) sur ${c.name}. Ajustez la capacité ou laissez l'autoscaling réagir.`;
            icon = '🦄';
        } else if (e.type === 'CREDENTIALS_LEAK') {
            desc = `Secrets exposés sur ${c.name}. Bloqué si HashiCorp Vault est déployé dans la zone Security.`;
            icon = '🔑';
        } else if (e.type === 'CONFIG_EXPLOIT') {
            desc = `Exploitation IAM sur ${c.name}. Bloqué par des politiques IAM strictes.`;
            icon = '⚙️';
        } else if (e.type === 'DNS_ATTACK') {
            desc = `Attaque par empoisonnement DNS sur ${c.name}. Mitigé par Anycast ou WAF.`;
            icon = '🌐';
        } else if (e.type === 'BRUTE_FORCE') {
            desc = `Tentatives de brute force SSH sur ${c.name}. Mitigé par Secret Manager ou Vault.`;
            icon = '🔑';
        } else if (e.type === 'DISK_FULL') {
            desc = `Espace disque plein sur Postgres de ${c.name}. Exécutez Vacuum [D] ou migrez vers Cloud SQL.`;
            icon = '💾';
        } else if (e.type === 'ZONE_OUTAGE') {
            desc = `Panne de zone physique sur ${c.name}. VM et DB Postgres uniques bridées à 20% !`;
            icon = '💥';
        } else {
            desc = `Perturbation sur l'infrastructure de ${c.name}.`;
            icon = '🔥';
        }
        
        let cardClass = 'active-incident-card';
        if (e.level === 'securite') {
            cardClass += ' security';
            icon = '🔒';
        } else if (e.level === 'alerte') {
            icon = '⚠️';
        }
        
        let levelBadge = '';
        if (e.level === 'securite') {
            levelBadge = `<span class="badge-tag level-security" style="background: #a855f7; color: #fff; padding: 1px 4px; border-radius: 2px; font-size: 0.62rem; font-weight: bold; margin-left: 4px;">🔒 Sécurité</span>`;
        } else if (e.level === 'alerte') {
            levelBadge = `<span class="badge-tag level-warning" style="background: #f97316; color: #fff; padding: 1px 4px; border-radius: 2px; font-size: 0.62rem; font-weight: bold; margin-left: 4px;">⚠️ Alerte</span>`;
        } else {
            levelBadge = `<span class="badge-tag level-danger" style="background: #ef4444; color: #fff; padding: 1px 4px; border-radius: 2px; font-size: 0.62rem; font-weight: bold; margin-left: 4px;">🚨 Dégradation</span>`;
        }
        
        let timerText = '';
        if (e.graceTimer > 0) {
            timerText = `Grâce: ${e.graceTimer}s`;
        } else {
            timerText = `${e.durationRemaining}s`;
        }
        
        html += `
            <div class="${cardClass}">
                <div class="active-incident-title">
                    <span>${icon} ${e.name} [${c.name}]${levelBadge}</span>
                    <span class="active-incident-duration">${timerText}</span>
                </div>
                <div class="active-incident-desc">${desc}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function updateKpiTooltips() {
    const budgetTooltip = document.getElementById('tooltip-budget');
    const slaTooltip = document.getElementById('tooltip-sla');
    const qpsTooltip = document.getElementById('tooltip-qps');
    const latencyTooltip = document.getElementById('tooltip-latency');
    
    if (!budgetTooltip || !slaTooltip || !qpsTooltip || !latencyTooltip) return;
    
    // 1. Budget Tooltip
    const financials = state.lastFinancials || {
        contractIncome: 0, slaModifier: 1.0, totalIncome: 0, maintenanceCost: 0,
        lbCost: 0, computeCost: 0, dbCost: 0, cdnCost: 0, autoscaleCost: 0, netProfit: 0
    };
    
    const slaPercent = Math.round(financials.slaModifier * 100);
    const slaModText = financials.slaModifier < 1.0 
        ? `<span class="tooltip-row red">Pénalité SLA : -${100 - slaPercent}% de revenus</span>` 
        : `<span class="tooltip-row green">SLA nominal : +0% pénalité</span>`;
        
    budgetTooltip.innerHTML = `
        <div class="tooltip-header">Finances & Budget</div>
        <div class="tooltip-desc">Suivi financier détaillé et charges de maintenance de l'infrastructure.</div>
        <div class="tooltip-section" style="margin-top:0.25rem;">
            <span class="tooltip-title-sub">Revenus (Entrées)</span>
            <div class="tooltip-row green"><span>Revenus bruts des contrats :</span><span>+${formatNumber(financials.contractIncome)} $/s</span></div>
            <div class="tooltip-row">${slaModText}</div>
            <div class="tooltip-row green" style="font-weight:600;"><span>Revenu net perçu :</span><span>+${formatNumber(financials.totalIncome)} $/s</span></div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-section">
            <span class="tooltip-title-sub">Dépenses d'Infrastructure (Sorties)</span>
            <div class="tooltip-row red"><span>Maintenance LB Anycast :</span><span>-${formatNumber(financials.lbCost)} $/s</span></div>
            <div class="tooltip-row red"><span>Maintenance Serveurs Compute :</span><span>-${formatNumber(financials.computeCost)} $/s</span></div>
            <div class="tooltip-row red"><span>Maintenance Cluster DB :</span><span>-${formatNumber(financials.dbCost)} $/s</span></div>
            <div class="tooltip-row red"><span>Maintenance CDN Edge Cache :</span><span>-${formatNumber(financials.cdnCost)} $/s</span></div>
            ${financials.autoscaleCost > 0 ? `<div class="tooltip-row red"><span>Surcharge Auto-scaling :</span><span>-${formatNumber(financials.autoscaleCost)} $/s</span></div>` : ''}
            <div class="tooltip-row red" style="font-weight:600; border-top: 1px dashed rgba(255,255,255,0.05); padding-top:0.2rem; margin-top:0.1rem;">
                <span>Total Maintenance :</span>
                <span>-${formatNumber(financials.maintenanceCost)} $/s</span>
            </div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row" style="font-weight:bold; font-size:0.78rem; color:${financials.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">
            <span>Bilan financier net :</span>
            <span>${financials.netProfit >= 0 ? '+' : ''}${formatNumber(financials.netProfit)} $/s</span>
        </div>
    `;
    
    // 2. SLA Tooltip
    let activePenalty = "Aucune (100% de revenus)";
    if (state.sla < 95.0) activePenalty = "Désastreuse (-90% de revenus)";
    else if (state.sla < 99.0) activePenalty = "Critique (-50% de revenus)";
    else if (state.sla < 99.9) activePenalty = "Moyenne (-20% de revenus)";
    
    slaTooltip.innerHTML = `
        <div class="tooltip-header">Qualité de Service (SLA)</div>
        <div class="tooltip-desc">Fiabilité applicative agrégée sur la fenêtre glissante des 60 dernières secondes.</div>
        <div class="tooltip-section" style="margin-top:0.25rem;">
            <span class="tooltip-title-sub">Objectif de Service (SLO)</span>
            <div class="tooltip-row yellow"><span>Disponibilité cible SLO :</span><span>≥ 99.99%</span></div>
            <div class="tooltip-row"><span>SLA mesuré actuellement :</span><span>${state.sla.toFixed(2)}%</span></div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-section">
            <span class="tooltip-title-sub">Modificateurs de Revenus</span>
            <div class="tooltip-row green"><span>SLA ≥ 99.90% :</span><span>Pénalité 0%</span></div>
            <div class="tooltip-row yellow"><span>SLA &lt; 99.90% :</span><span>Pénalité -20% (Revenus x0.8)</span></div>
            <div class="tooltip-row red"><span>SLA &lt; 99.00% :</span><span>Pénalité -50% (Revenus x0.5)</span></div>
            <div class="tooltip-row red"><span>SLA &lt; 95.00% :</span><span>Pénalité -90% (Revenus x0.1)</span></div>
            <div class="tooltip-row muted" style="border-top:1px dashed rgba(255,255,255,0.05); padding-top:0.2rem; margin-top:0.1rem;">
                <span>Pénalité active :</span>
                <span style="font-weight:600; color:${state.sla < 99.9 ? 'var(--red)' : 'var(--green)'}">${activePenalty}</span>
            </div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-section">
            <span class="tooltip-title-sub">Facteurs de Dégradation</span>
            <div class="tooltip-row red"><span>• Requêtes perdues :</span><span>Surcharges LB, CPU, DB</span></div>
            <div class="tooltip-row red"><span>• Timeouts (&gt;200ms) :</span><span>Latence excessive</span></div>
        </div>
    `;
    
    // 3. Réseau Tooltip
    const net = state.lastNetworkDetails || {
        baseQps: 0, ddosQps: 0, unicornQps: 0, wafBlocked: 0,
        lbCapacity: 100, computeCapacity: 80, dbCapacity: 50,
        droppedRequests: 0, latencyDropped: 0
    };
    const lbSaturation = net.lbCapacity > 0 ? (state.qps / net.lbCapacity) * 100 : 0;
    
    qpsTooltip.innerHTML = `
        <div class="tooltip-header">Télémétrie Réseau (QPS)</div>
        <div class="tooltip-desc">Analyse des flux de paquets de requêtes HTTP par seconde transitant vers l'infra.</div>
        <div class="tooltip-section" style="margin-top:0.25rem;">
            <span class="tooltip-title-sub">Origine du trafic</span>
            <div class="tooltip-row"><span>Trafic régulier contrats :</span><span>${Math.round(net.baseQps)} QPS</span></div>
            ${net.ddosQps > 0 ? `<div class="tooltip-row red"><span>Attaque volumétrique DDoS :</span><span>+${net.ddosQps} QPS</span></div>` : ''}
            ${net.unicornQps > 0 ? `<div class="tooltip-row green"><span>Buzz Product Hunt (Unicorn) :</span><span>+${net.unicornQps} QPS</span></div>` : ''}
            ${net.wafBlocked > 0 ? `<div class="tooltip-row green"><span>Trafic malveillant filtré :</span><span>-${net.wafBlocked} QPS</span></div>` : ''}
            <div class="tooltip-row" style="font-weight:600; border-top:1px dashed rgba(255,255,255,0.05); padding-top:0.2rem;">
                <span>Volume réseau total :</span>
                <span>${Math.round(state.qps)} QPS</span>
            </div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-section">
            <span class="tooltip-title-sub">Supervision Ingress</span>
            <div class="tooltip-row"><span>Capacité Max LB :</span><span>${net.lbCapacity} QPS</span></div>
            <div class="tooltip-row" style="color:${lbSaturation > 80 ? 'var(--red)' : 'var(--color-muted)'}">
                <span>Taux de charge LB :</span>
                <span>${Math.round(lbSaturation)}%</span>
            </div>
            <div class="tooltip-row red" style="font-weight:600;">
                <span>Requêtes perdues (Dropped) :</span>
                <span>${Math.round(net.droppedRequests)} QPS</span>
            </div>
        </div>
    `;
    
    // 4. Latence Tooltip (Mise en œuvre des composants réels)
    const hasCdnGcp = state.infrastructure.components.some(c => c.type === 'cdn');
    const hasCdnVarnish = state.infrastructure.components.some(c => c.type === 'cdn_varnish');
    const hasCdn = state.infrastructure.cdnActive || hasCdnGcp || hasCdnVarnish;
    
    const hasWafGcp = state.infrastructure.components.some(c => c.type === 'waf');
    const hasWafModSec = state.infrastructure.components.some(c => c.type === 'waf_modsec');
    const hasWafComponent = hasWafGcp || hasWafModSec;
    const wafActive = state.actions.waf.active;
    
    const hasRedisGcp = state.infrastructure.components.some(c => c.type === 'db_redis');
    const hasRedisVm = state.infrastructure.components.some(c => c.type === 'db_redis_vm');
    const hasRedis = hasRedisGcp || hasRedisVm;
    
    const hasTrace = state.infrastructure.components.some(c => c.type === 'monitoring_trace');
    const hasVertex = state.infrastructure.components.some(c => c.type === 'ai_vertex');
    const hasSpanner = state.infrastructure.components.some(c => c.type === 'db_spanner');

    const cdnGain = hasCdn ? 15 : 0;
    const redisGain = hasRedis ? 10 : 0;
    
    // Surcharges CPU Compute
    let computeOverhead = 0;
    const computes = state.infrastructure.components.filter(c => c.tier === 'compute');
    if (computes.length > 0) {
        computes.forEach(c => {
            if (c.activeMaxQps > 0 && c.activeQps > c.activeMaxQps) {
                const ratio = c.activeQps / c.activeMaxQps;
                computeOverhead += ratio * 120 * (c.activeQps / (state.qps || 1));
            } else {
                computeOverhead += (c.latencyOverhead || 0) * (c.activeQps / (state.qps || 1));
            }
        });
    }
    
    // Surcharges DB
    let dbOverhead = 0;
    const dbs = state.infrastructure.components.filter(c => c.tier === 'db');
    let dbCapacity = 0;
    dbs.forEach(d => {
        if (d.type === 'db_master') dbCapacity += 150;
        if (d.type === 'db_replica') dbCapacity += 100;
        if (d.type === 'db_spanner') dbCapacity += 1000;
    });
    let dbLockedRatio = 1.0;
    if (!hasSpanner) {
        state.activeEvents.forEach(e => {
            if (e.type === 'DB_LOCK') dbLockedRatio = 0.3;
        });
    }
    const activeDbCapacity = dbCapacity * dbLockedRatio;
    const dbTraffic = hasRedis ? state.qps * 0.65 : state.qps;
    if (dbTraffic > activeDbCapacity && activeDbCapacity > 0) {
        const dbRatio = dbTraffic / activeDbCapacity;
        dbOverhead = dbRatio * 200;
    }
    
    // Transit BGP / Fibre coupée
    let bgpOverhead = 0;
    state.activeEvents.forEach(e => {
        if (e.type === 'FIBER_CUT') {
            const cdnMitigation = hasCdn ? 0.9 : 0.0;
            bgpOverhead = 220 * (1 - cdnMitigation);
        }
    });

    // Buffer queue
    let queueOverhead = 0;
    const queueComps = state.infrastructure.components.filter(c => c.tier === 'queue');
    const maxQueueLimit = queueComps.reduce((acc, q) => {
        const metrics = COMPONENT_METRICS[q.type];
        return acc + (metrics ? metrics.maxQueueSize : 0);
    }, 0);
    if (maxQueueLimit > 0 && state.queueSize > 0) {
        const avgQueueOverhead = queueComps.reduce((acc, q) => {
            const metrics = COMPONENT_METRICS[q.type];
            return acc + (metrics ? metrics.latencyOverhead : 0);
        }, 0) / queueComps.length;
        queueOverhead = (state.queueSize / maxQueueLimit) * avgQueueOverhead;
    }
    
    latencyTooltip.innerHTML = `
        <div class="tooltip-header">Temps de Réponse (Latence)</div>
        <div class="tooltip-desc">Décomposition analytique de la latence moyenne de traitement en millisecondes.</div>
        <div class="tooltip-section" style="margin-top:0.25rem;">
            <span class="tooltip-title-sub">Ventilation des délais</span>
            <div class="tooltip-row"><span>Latence FAI nominale :</span><span>45 ms</span></div>
            ${cdnGain > 0 ? `<div class="tooltip-row green"><span>Gain Edge Cache CDN :</span><span>-${cdnGain} ms</span></div>` : ''}
            ${redisGain > 0 ? `<div class="tooltip-row green"><span>Optimisation Cache Redis :</span><span>-${redisGain} ms</span></div>` : ''}
            ${wafActive ? `<div class="tooltip-row red"><span>Pénalité filtrage WAF :</span><span>+12 ms</span></div>` : ''}
            ${hasWafGcp ? `<div class="tooltip-row red"><span>Overhead Armor WAF :</span><span>+5 ms</span></div>` : ''}
            ${hasWafModSec ? `<div class="tooltip-row red"><span>Overhead ModSecurity WAF :</span><span>+8 ms</span></div>` : ''}
            ${hasVertex ? `<div class="tooltip-row red"><span>Overhead Passerelle IA :</span><span>+25 ms</span></div>` : ''}
            ${queueOverhead > 0 ? `<div class="tooltip-row red"><span>Buffer Queue (Message Broker) :</span><span>+${Math.round(queueOverhead)} ms</span></div>` : ''}
            ${computeOverhead > 0 ? `<div class="tooltip-row red"><span>Surcharge CPU Compute :</span><span>+${Math.round(computeOverhead)} ms</span></div>` : ''}
            ${dbOverhead > 0 ? `<div class="tooltip-row red"><span>Surcharge verrous SQL DB :</span><span>+${Math.round(dbOverhead)} ms</span></div>` : ''}
            ${bgpOverhead > 0 ? `<div class="tooltip-row red"><span>Panne transit BGP (Fibre) :</span><span>+${Math.round(bgpOverhead)} ms</span></div>` : ''}
            ${hasTrace ? `<div class="tooltip-row green"><span>Optimisation OTel Profile :</span><span>-10%</span></div>` : ''}
            <div class="tooltip-row" style="font-weight:600; border-top: 1px dashed rgba(255,255,255,0.05); padding-top:0.2rem;">
                <span>Latence cumulée :</span>
                <span style="color:${state.latency > 150 ? 'var(--red)' : 'var(--green)'}">${Math.round(state.latency)} ms</span>
            </div>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-section">
            <span class="tooltip-title-sub">Classification des temps</span>
            <div class="tooltip-row green"><span>&lt; 150 ms :</span><span>Nominal (SLA OK)</span></div>
            <div class="tooltip-row yellow"><span>150 ms - 200 ms :</span><span>Latence dégradée</span></div>
            <div class="tooltip-row red" style="font-weight:600;"><span>&gt; 200 ms :</span><span>HTTP Timeout (Drop SLA)</span></div>
        </div>
    `;
}

// --- CONTRACTS RENDERING & INTERACTIONS ---
function renderContractsList() {
    const container = document.getElementById('contracts-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const signedContracts = state.contracts.filter(c => c.signed);
    const availableContracts = state.contracts.filter(c => !c.signed);
    
    // Section Contrats Actifs
    if (signedContracts.length > 0) {
        const activeSection = document.createElement('div');
        activeSection.className = 'contracts-section active-section';
        
        const titleSigned = document.createElement('h3');
        titleSigned.className = 'contract-section-title';
        titleSigned.style.cssText = 'font-family: var(--font-mono); font-size: 0.8rem; color: var(--green); margin: 0.25rem 0 0.75rem 0; text-transform: uppercase; border-bottom: 1px dashed rgba(57, 255, 20, 0.3); padding-bottom: 0.25rem;';
        titleSigned.innerText = '✍️ Contrats Actifs';
        activeSection.appendChild(titleSigned);
        
        signedContracts.forEach(contract => {
            activeSection.appendChild(createContractCard(contract));
        });
        
        container.appendChild(activeSection);
    }
    
    // Section Contrats Disponibles
    if (availableContracts.length > 0) {
        const availableSection = document.createElement('div');
        availableSection.className = 'contracts-section available-section';
        
        const titleAvailable = document.createElement('h3');
        titleAvailable.className = 'contract-section-title';
        titleAvailable.style.cssText = 'font-family: var(--font-mono); font-size: 0.8rem; color: var(--cyan); margin: 0.25rem 0 0.75rem 0; text-transform: uppercase; border-bottom: 1px dashed rgba(0, 240, 255, 0.3); padding-bottom: 0.25rem;';
        titleAvailable.innerText = '📋 Contrats Disponibles';
        availableSection.appendChild(titleAvailable);
        
        availableContracts.forEach(contract => {
            availableSection.appendChild(createContractCard(contract));
        });
        
        container.appendChild(availableSection);
    }
}

function createContractCard(contract) {
    const infraToTest = contract.signed ? contract.infrastructure : state.infrastructure;
    
    // Calcul du SLA global moyen de la compagnie pour les prérequis de signature
    const signedContractsList = state.contracts.filter(c => c.signed);
    const currentCompanySla = signedContractsList.length > 0 
        ? (signedContractsList.reduce((sum, c) => sum + c.sla, 0) / signedContractsList.length) 
        : 100.0;
        
    // La signature dépend uniquement de la confiance et du SLA de la compagnie
    const isTrustOk = state.trust >= (contract.minTrustToSign || 0);
    const isSlaOk = currentCompanySla >= (contract.minSlaToSign || 0);
    const canSign = isTrustOk && isSlaOk;
    
    const card = document.createElement('div');
    let borderClass = '';
    let statusBadge = '';
    
    if (contract.signed) {
        if (contract.sla < contract.requiredSla) {
            borderClass = 'warning';
            statusBadge = `<span class="contract-status breach">Rupture (${10 - contract.breachTimer}s)</span>`;
        } else {
            borderClass = 'signed';
            statusBadge = '<span class="contract-status active">Actif</span>';
        }
        if (contract.id === state.activeContractId) {
            borderClass += ' selected-contract';
        }
    } else {
        if (canSign) {
            borderClass = 'ready';
            statusBadge = '<span class="contract-status ready">Prêt</span>';
        } else {
            borderClass = 'locked';
            statusBadge = '<span class="contract-status locked">Verrouillé</span>';
        }
    }
    
    card.className = `contract-card ${borderClass}`;
    card.style.cursor = contract.signed ? 'pointer' : 'default';
    
    if (contract.signed) {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            window.selectContractById(contract.id);
        });
    }
    
    let buttonRow = '';
    if (contract.signed) {
        buttonRow = `<button class="btn btn-danger" onclick="event.stopPropagation(); terminateContract('${contract.id}')">Résilier le contrat</button>`;
    } else {
        buttonRow = `<button class="btn" ${canSign ? '' : 'disabled'} onclick="event.stopPropagation(); signContract('${contract.id}')">${canSign ? '⚡ Démarrer le contrat' : '🔒 Seuils insuffisants'}</button>`;
    }
    
    let thresholdMarkup = '';
    let requirementMarkup = '';
    
    if (!contract.signed) {
        // Balisage didactique des seuils requis pour s'engager
        const trustIcon = isTrustOk ? '✅' : '❌';
        const slaIcon = isSlaOk ? '✅' : '❌';
        const trustColor = isTrustOk ? 'var(--green)' : 'var(--red)';
        const slaColor = isSlaOk ? 'var(--green)' : 'var(--red)';
        
        thresholdMarkup = `
            <div class="contract-requirement ${canSign ? 'ready' : 'locked'}" style="padding: 0.4rem; background: rgba(0, 240, 255, 0.03); border: 1px solid ${canSign ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 59, 48, 0.2)'}; border-radius: 4px; font-size: 0.72rem; margin-top: 0.4rem;">
                <div style="font-weight: bold; color: var(--cyan); margin-bottom: 0.25rem;">📊 Prérequis de signature :</div>
                <ul style="padding-left: 0; margin: 0; list-style: none;">
                    <li style="color: ${trustColor}; display: flex; align-items: center; gap: 4px;">
                        <span>${trustIcon}</span> Confiance globale : ${contract.minTrustToSign}% requis (Actuelle : ${Math.round(state.trust)}%)
                    </li>
                    <li style="color: ${slaColor}; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                        <span>${slaIcon}</span> SLA global moyen : ${contract.minSlaToSign}% requis (Actuel : ${currentCompanySla.toFixed(2)}%)
                    </li>
                </ul>
            </div>
        `;
    }
    
    // Liste des spécifications techniques de l'architecture cible (toujours affichée)
    let reqsHtml = '';
    if (contract.reqDetails && contract.reqDetails.length > 0) {
        contract.reqDetails.forEach(req => {
            const ok = req.check(infraToTest, contract);
            const icon = ok 
                ? '<span style="color: var(--green); margin-right: 4px;">✅</span>' 
                : '<span style="color: var(--red); margin-right: 4px;">❌</span>';
            const style = ok 
                ? 'color: var(--color-text); font-weight: normal;' 
                : 'color: rgba(255,255,255,0.7);';
            reqsHtml += `<li style="list-style: none; margin-bottom: 2px; ${style}">${icon} ${req.text}</li>`;
        });
    }
    requirementMarkup = `
        <div class="contract-requirement" style="padding: 0.4rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; font-size: 0.72rem; margin-top: 0.4rem;">
            <div style="font-weight: bold; color: var(--color-muted); margin-bottom: 0.25rem;">⚙️ Spécifications d'infrastructure à déployer :</div>
            <ul style="padding-left: 0; margin: 0;">
                ${reqsHtml}
            </ul>
        </div>
    `;
    
    let marketingSection = '';
    let activeIndicator = '';
    if (contract.signed) {
        if (contract.id === state.activeContractId) {
            activeIndicator = '<div class="contract-card-active-indicator"></div>';
        }
        
        // Flash Booster
        const flashActive = contract.marketingFlashActive;
        const flashCd = contract.marketingFlashCooldown || 0;
        let flashText = 'Flash Booster (50 $)';
        if (flashActive) {
            flashText = `⚡ Actif (${contract.marketingFlashTimer}s)`;
        } else if (flashCd > 0) {
            flashText = `⏳ Cooldown (${Math.ceil(flashCd * 1.33)}s)`;
        }
        const flashDisabled = flashActive || flashCd > 0 || state.budget < 50;
 
        // Campagne Growth
        const growthActive = contract.marketingGrowthActive;
        let growthText = 'Campagne Growth (150 $)';
        if (growthActive) {
            growthText = '📈 Growth Active';
        }
        const growthDisabled = growthActive || state.budget < 150;
 
        // Badges d'état marketing
        let badgesHtml = '';
        if (flashActive) {
            badgesHtml += '<span class="marketing-badge flash" style="margin-right: 4px;">⚡ Flash</span>';
        }
        if (growthActive) {
            badgesHtml += '<span class="marketing-badge campaign">📈 Growth</span>';
        }
        if (badgesHtml) {
            badgesHtml = `<div style="margin-bottom: 0.35rem; display: flex; flex-wrap: wrap; gap: 4px;">${badgesHtml}</div>`;
        }
 
        marketingSection = `
            <div class="marketing-controls" style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px solid rgba(255,255,255,0.08);">
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: rgba(255,255,255,0.5); margin-bottom: 0.25rem; text-transform: uppercase;">Booster Marketing :</div>
                ${badgesHtml}
                <div style="display: flex; gap: 4px; margin-bottom: 0.4rem;">
                    <button class="btn btn-warning btn-marketing" style="flex: 1;" ${flashDisabled ? 'disabled' : ''} onclick="event.stopPropagation(); triggerMarketingFlash('${contract.id}')">${flashText}</button>
                    <button class="btn btn-info btn-marketing" style="flex: 1;" ${growthDisabled ? 'disabled' : ''} onclick="event.stopPropagation(); triggerMarketingGrowth('${contract.id}')">${growthText}</button>
                </div>
            </div>
        `;
    }
    
    // Afficher le SLA actuel s'il est signé
    let slaDetails = '';
    let extraDetails = '';
    if (contract.signed) {
        slaDetails = `<span>SLA actuel : <strong style="color: ${contract.sla < contract.requiredSla ? 'var(--red)' : 'var(--green)'}">${contract.sla.toFixed(2)}%</strong> (exigé: ≥${contract.requiredSla.toFixed(2)}%)</span>`;
        extraDetails = `
        <div class="contract-details" style="margin-top: 0.15rem; font-size: 0.75rem;">
            <span>Confiance client :</span>
            <strong style="color: ${contract.trust < 50 ? 'var(--red)' : (contract.trust < 80 ? 'var(--yellow)' : 'var(--green)')}">${Math.round(contract.trust)}%</strong>
        </div>
        `;
    } else {
        slaDetails = `<span>SLA exigé : <strong>≥${contract.requiredSla.toFixed(2)}%</strong></span>`;
        extraDetails = `
        <div class="contract-details" style="font-weight: 600; color: var(--cyan); margin-top: 0.15rem; font-size: 0.75rem;">
            <span>Financement initial (Upfront) :</span>
            <span>+${formatNumber(contract.upfrontFunding)} $</span>
        </div>
        `;
    }
    
    card.innerHTML = `
        ${activeIndicator}
        <div class="contract-header">
            <span class="contract-name">${contract.name}</span>
            ${statusBadge}
        </div>
        <p class="upgrade-desc" style="font-size: 0.74rem; margin-bottom: 0.4rem; line-height: 1.35;">${contract.desc}</p>
        <div class="contract-details">
            <span>Charge réseau : <strong>${Math.round(contract.currentQps)} QPS</strong></span>
            ${slaDetails}
        </div>
        <div class="contract-details" style="font-weight: 600; color: var(--green); margin-top: 0.15rem; font-size: 0.75rem;">
            <span>Revenu estimé :</span>
            <span>+${formatNumber(contract.currentRevenue)} $/s</span>
        </div>
        ${extraDetails}
        ${thresholdMarkup}
        ${requirementMarkup}
        ${marketingSection}
        <div class="contract-btn-row" style="margin-top: 0.5rem;">
            ${buttonRow}
        </div>
    `;
    
    return card;
}

function renderProjectTabs() {
    const container = document.getElementById('project-tabs');
    if (!container) return;
    
    const signedContracts = state.contracts.filter(c => c.signed);
    
    if (signedContracts.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = '';
    
    signedContracts.forEach(c => {
        const btn = document.createElement('button');
        const isActive = c.id === state.activeContractId;
        
        let btnClass = 'project-tab-btn';
        if (isActive) btnClass += ' active';
        
        // --- ÉVALUATION DE L'ÉTAT DU PROJET ---
        // 1. Service dégradé (Rouge) : SLA en rupture ou incident actif hors période de grâce
        const hasActiveEvents = c.activeEvents && c.activeEvents.length > 0;
        const isDegraded = c.sla < c.requiredSla || 
            (hasActiveEvents && c.activeEvents.some(e => e.graceTimer === 0 || e.graceTimer === undefined));
            
        // 2. Charge importante / Grâce (Jaune-Orange) : charge CPU > 80% ou incident sous grâce
        const computes = c.infrastructure && c.infrastructure.components 
            ? c.infrastructure.components.filter(comp => comp.tier === 'compute') 
            : [];
        const hasHighLoad = computes.some(comp => comp.load > 0.8);
        const hasIncidentInGrace = hasActiveEvents && c.activeEvents.some(e => e.graceTimer > 0);
        const isWarning = !isDegraded && (hasHighLoad || hasIncidentInGrace || (c.gracePeriodTimer > 0));
        
        // Application de la classe de couleur correspondante
        if (isDegraded) {
            btnClass += ' tab-status-degraded';
        } else if (isWarning) {
            btnClass += ' tab-status-warn';
        } else {
            btnClass += ' tab-status-ok';
        }
        
        btn.className = btnClass;
        
        // Couleur de la confiance
        let trustColorClass = 'tab-trust-green';
        if (c.trust < 50) trustColorClass = 'tab-trust-red';
        else if (c.trust < 80) trustColorClass = 'tab-trust-orange';
        
        // Badge d'incident
        let incidentBadge = '';
        if (hasActiveEvents) {
            incidentBadge = `<span class="project-tab-badge-incident">🚨 ${c.activeEvents.length}</span>`;
        }
        
        // Raccourcir le nom pour l'onglet
        const shortName = c.name.split(' (')[0];
        
        btn.innerHTML = `
            <span class="project-tab-name">${shortName}</span>
            <span class="project-tab-badge">SLA: <strong style="color: ${c.sla < c.requiredSla ? 'var(--red)' : 'var(--green)'}">${c.sla.toFixed(1)}%</strong></span>
            <span class="project-tab-badge">Confiance: <strong class="${trustColorClass}">${Math.round(c.trust)}%</strong></span>
            ${incidentBadge}
        `;
        
        btn.addEventListener('click', () => {
            window.selectContractById(c.id);
        });
        
        container.appendChild(btn);
    });
}

window.signContract = function(id) {
    const contract = state.contracts.find(c => c.id === id);
    if (contract && !contract.signed) {
        // Évaluation des prérequis de signature (Confiance et SLA de la compagnie)
        const signedContractsList = state.contracts.filter(c => c.signed);
        const currentCompanySla = signedContractsList.length > 0 
            ? (signedContractsList.reduce((sum, c) => sum + c.sla, 0) / signedContractsList.length) 
            : 100.0;
            
        const isTrustOk = state.trust >= (contract.minTrustToSign || 0);
        const isSlaOk = currentCompanySla >= (contract.minSlaToSign || 0);
        
        if (isTrustOk && isSlaOk) {
            contract.signed = true;
            contract.breachTimer = 0;
            contract.sla = 100.00;
            contract.slaWindow = Array(20).fill(1.0);
            contract.slaWindowIndex = 0;
            contract.trust = 50.0;
            
            // Garantir que l'infrastructure commence vide à la signature (sauf pour startup)
            if (contract.id !== 'startup') {
                contract.infrastructure = {
                    lbAlgo: 'round-robin',
                    cdnActive: false,
                    cdnCost: 150,
                    cdnMaintenance: 2,
                    components: []
                };
            }
            
            // Crédit des fonds de départ (Upfront Funding)
            state.budget += contract.upfrontFunding;
            
            // Sélectionner et commuter automatiquement sur la topologie du nouveau contrat
            window.selectContractById(id);
            
            logMessage("Nouveau client", `Contrat '${contract.name}' signé ! +${Math.round(contract.currentQps)} QPS. Financement initial reçu : +${contract.upfrontFunding} $. Cockpit connecté à sa topologie.`, "green");
            addTemporaryNotification("Contrat Actif", `Financement initial de +${contract.upfrontFunding} $ crédité !`, "green", 6000);
            
            // Déclencheur tutoriel pour signature du premier contrat
            checkTutorialTriggers('sign_contract', id);
        }
    }
};

window.terminateContract = function(id) {
    const contract = state.contracts.find(c => c.id === id);
    if (contract && contract.signed) {
        contract.signed = false;
        logMessage("Contrat résilié", `Manœuvre de dé-provisionnement pour '${contract.name}' achevée.`, "info");
        
        // Si le contrat résilié était le contrat actif, basculer sur un autre contrat signé restant ou sur startup
        if (state.activeContractId === id) {
            const alternative = state.contracts.find(c => c.signed);
            state.activeContractId = alternative ? alternative.id : 'startup';
        }
        
        updateNodePositions();
        updateUIElements();
        renderContractsList();
    }
};

window.selectContractById = function(id) {
    const contract = state.contracts.find(c => c.id === id);
    if (contract && contract.signed) {
        state.activeContractId = id;
        logMessage("Réseau connecté", `Cockpit commuté sur l'infrastructure de '${contract.name}'.`, "info");
        updateNodePositions();
        updateUIElements();
        renderContractsList();
    }
};

window.triggerMarketingFlash = function(id) {
    const contract = state.contracts.find(c => c.id === id);
    if (contract && contract.signed && !contract.marketingFlashActive && (!contract.marketingFlashCooldown || contract.marketingFlashCooldown === 0) && state.budget >= 50) {
        state.budget -= 50;
        contract.marketingFlashActive = true;
        contract.marketingFlashTimer = 15; // 20s (15 ticks * 1.33s = 20s)
        contract.marketingFlashCooldown = 0;
        logMessage(`Marketing Flash Activé [${contract.name}]`, "Trafic utilisateur doublé pendant 20s pour booster les revenus !", "warning");
        addTemporaryNotification(`Marketing Flash : ${contract.name}`, "Le QPS de ce contrat est temporairement doublé !", "warning", 6000);
        updateUIElements();
        renderContractsList();
    }
};

window.triggerMarketingGrowth = function(id) {
    const contract = state.contracts.find(c => c.id === id);
    if (contract && contract.signed && !contract.marketingGrowthActive && state.budget >= 150) {
        state.budget -= 150;
        contract.marketingGrowthActive = true;
        logMessage(`Campagne Growth Activée [${contract.name}]`, "Taux de croissance organique mensuelle fixé à +15% de QPS de façon permanente.", "info");
        addTemporaryNotification(`Campagne Growth : ${contract.name}`, "Croissance mensuelle permanente +15% de QPS / +5% de revenus.", "info", 6000);
        updateUIElements();
        renderContractsList();
    }
};

// --- EMERGENCY ACTIONS ---
function triggerWaf() {
    const hasWaf = state.infrastructure.components.some(c => c.type === 'waf' || c.type === 'waf_modsec');
    if (!hasWaf) {
        logMessage("Action bloquée", "Vous devez déployer un Cloud Armor WAF ou ModSecurity WAF pour utiliser cette action.", "warning");
        return;
    }
    if (state.actions.waf.cooldown === 0 && !state.actions.waf.active) {
        state.actions.waf.active = true;
        state.actions.waf.activeTimer = state.actions.waf.duration;
        logMessage("WAF Activé", "Filtrage DDoS en cours. Overhead de latence réseau mineur.", "warning");
        if (state.stats) state.stats.actionsCount++;
        updateUIElements();
    }
}

function triggerDbOptimization() {
    if (state.actions.dbOpt.cooldown === 0) {
        state.actions.dbOpt.cooldown = state.actions.dbOpt.maxCooldown;
        
        const activeContract = state.contracts.find(c => c.id === state.activeContractId);
        const dbLockEvent = activeContract ? activeContract.activeEvents.find(e => e.type === 'DB_LOCK') : null;
        if (dbLockEvent) {
            dbLockEvent.durationRemaining = 2; // Clean deadlocks
            logMessage("Maintenance DB active", "Purge des deadlocks SQL et reconstruction des index réussie.", "info");
        } else {
            logMessage("Maintenance DB active", "Reconstruction des index effectuée.", "info");
        }
        if (state.stats) state.stats.actionsCount++;
        updateUIElements();
    }
}

// --- CHAOS ENGINE & SIMULATION LOGIC ---
function simulationTick() {
    if (!state.gameStarted || state.gameOver || state.victory) return;
    
    // Déclencheur du tick du tutoriel
    checkTutorialTriggers('sim_tick');
    
    state.time++;
    
    // 1. Décrémenter les cooldowns des actions globales (une seule fois par tick global)
    if (state.actions.waf.active) {
        state.actions.waf.activeTimer--;
        if (state.actions.waf.activeTimer <= 0) {
            state.actions.waf.active = false;
            state.actions.waf.cooldown = state.actions.waf.maxCooldown;
            logMessage("WAF Désactivé", "Filtrage d'urgence désengagé.", "info");
        }
    } else if (state.actions.waf.cooldown > 0) {
        state.actions.waf.cooldown--;
    }
    
    if (state.actions.dbOpt.cooldown > 0) {
        state.actions.dbOpt.cooldown--;
    }
    
    if (state.chaosCooldown > 0) {
        state.chaosCooldown--;
    }
    
    // 2. Gérer le tick des événements de chaos pour TOUS les contrats signés
    state.contracts.forEach(c => {
        if (c.signed && c.activeEvents) {
            c.activeEvents.forEach(e => {
                e.durationRemaining--;
                
                // Gérer le graceTimer individuel
                if (e.graceTimer !== undefined && e.graceTimer > 0) {
                    e.graceTimer--;
                    // Conversion de l'alerte à l'expiration de sa grâce
                    if (e.graceTimer === 0) {
                        if (e.type === 'DISK_FULL') {
                            e.type = 'DB_LOCK';
                            e.name = 'Deadlock sur Transactions SQL (Aggravé)';
                            e.desc = 'Deadlock SQL transactionnel sur ' + c.name + '. Lancez le Vacuum DB [D].';
                            e.level = 'degradation';
                            e.durationRemaining = 18;
                            logMessage(
                                `ALERTE AGGRAVÉE [${c.name}]`, 
                                `Le disque plein s'est aggravé en Deadlock SQL (Dégradation).`, 
                                "danger"
                            );
                            addTemporaryNotification(
                                `🚨 Dégradation : Deadlock SQL (Aggravé)`, 
                                `Le disque plein de ${c.name} a causé un verrouillage de la DB.`, 
                                "danger", 
                                6000
                            );
                        } else if (e.type === 'BRUTE_FORCE') {
                            e.type = 'CONFIG_EXPLOIT';
                            e.name = 'Exploit de Configuration IAM (Aggravé)';
                            e.desc = 'Escalade de privilèges sur ' + c.name + '. Mitigé par les règles IAM.';
                            e.level = 'securite';
                            e.durationRemaining = 15;
                            logMessage(
                                `INCIDENT AGGRAVÉ [${c.name}]`, 
                                `Le brute force SSH s'est aggravé en brèche de sécurité IAM !`, 
                                "security"
                            );
                            addTemporaryNotification(
                                `🔒 Sécurité : Exploit Config (Aggravé)`, 
                                `Brèche IAM active suite au brute force SSH sur ${c.name}.`, 
                                "security", 
                                6000
                            );
                        }
                    }
                }
            });
            
            c.activeEvents = c.activeEvents.filter(e => {
                if (e.durationRemaining <= 0) {
                    logMessage(`Incident résolu [${c.name}]`, `Fin de l'événement : ${e.name}.`, "green");
                    addTemporaryNotification(`Incident Résolu [${c.name}]`, `${e.name} est maintenant terminé. Retour au SLA nominal.`, "green", 6000);
                    state.chaosCooldown = 15; // Cooldown global de calme (15 ticks * 1.33s = 20s)
                    return false;
                }
                return true;
            });
            
            // Gérer les timers marketing
            if (c.marketingFlashActive) {
                c.marketingFlashTimer--;
                if (c.marketingFlashTimer <= 0) {
                    c.marketingFlashActive = false;
                    c.marketingFlashCooldown = 30; // 40s de cooldown au total (30 ticks * 1.33s = 40s)
                    logMessage(`Marketing Flash Terminé [${c.name}]`, `Le boost de trafic flash est expiré.`, "info");
                }
            } else if (c.marketingFlashCooldown > 0) {
                c.marketingFlashCooldown--;
            }
        }
    });
    
    // 3. Croissance mensuelle organique : toutes les 60s (45 ticks de 1.33s)
    if (state.time % 45 === 0) {
        let anySigned = false;
        state.contracts.forEach(c => {
            if (c.signed) {
                anySigned = true;
                const trafficGrowth = c.marketingGrowthActive ? 1.15 : 1.05;
                const revenueGrowth = c.marketingGrowthActive ? 1.05 : 1.03;
                c.currentQps *= trafficGrowth;
                c.currentRevenue = Math.floor(c.currentRevenue * revenueGrowth);
            }
        });
        if (anySigned) {
            logMessage("Mois écoulé (Croissance)", "Croissance mensuelle : Charge utilisateur et tarifs réévalués !", "info");
        }
    }
    
    // 4. Déclencher un chaos aléatoire
    triggerRandomChaos();
    
    // 5. Exécuter la simulation physique d'infrastructure pour chaque contrat signé
    const originalActiveId = state.activeContractId;
    let totalIncomeThisTick = 0;
    let totalMaintenanceThisTick = 0;
    
    state.contracts.forEach(c => {
        if (!c.signed) {
            // Contrats non signés : pas de charge ni de coûts
            c.qps = 0;
            c.latency = 0;
            return;
        }
        
        // Basculer temporairement le contrat actif pour que le moteur lise ses propriétés
        state.activeContractId = c.id;
        
        // Détecteurs de composants d'infrastructure
        const hasApm = state.infrastructure.components.some(comp => comp.type === 'monitoring_apm' || comp.type === 'monitoring_cloudmonitoring' || comp.type === 'monitoring_prometheus');
        const hasGitops = state.infrastructure.components.some(comp => comp.type === 'cicd_gitops');
        const hasChaosMesh = state.infrastructure.components.some(comp => comp.type === 'chaos_mesh');
        
        const hasWafGcp = state.infrastructure.components.some(comp => comp.type === 'waf');
        const hasWafModSec = state.infrastructure.components.some(comp => comp.type === 'waf_modsec');
        const hasWafComponent = hasWafGcp || hasWafModSec;
        
        const hasCdnGcp = state.infrastructure.components.some(comp => comp.type === 'cdn');
        const hasCdnVarnish = state.infrastructure.components.some(comp => comp.type === 'cdn_varnish');
        const hasCdn = state.infrastructure.cdnActive || hasCdnGcp || hasCdnVarnish;
        
        const hasRedisGcp = state.infrastructure.components.some(comp => comp.type === 'db_redis');
        const hasRedisVm = state.infrastructure.components.some(comp => comp.type === 'db_redis_vm');
        const hasRedis = hasRedisGcp || hasRedisVm;
        
        const hasTrace = state.infrastructure.components.some(comp => comp.type === 'monitoring_trace');
        const hasVertex = state.infrastructure.components.some(comp => comp.type === 'ai_vertex');
        const hasSpanner = state.infrastructure.components.some(comp => comp.type === 'db_spanner');

        // Réinitialiser la capacité des VM ordinaires qui peuvent être affectées par Zone Outage
        state.infrastructure.components.forEach(comp => {
            if (comp.type === 'compute_vm' || comp.id.includes('initial_1')) {
                comp.activeMaxQps = comp.maxQps;
            }
        });
        
        // A. GESTION DU CALCUL (warmup GKE, scaling VM)
        state.infrastructure.components.forEach(comp => {
            if (comp.type === 'compute_gke') {
                if (comp.activeMaxQps === 0) {
                    if (comp.warmupTimer === undefined) comp.warmupTimer = 10.0;
                    let tickDuration = 1.33;
                    if (hasApm) tickDuration *= 2.0;
                    if (hasGitops) tickDuration *= 2.0;
                    comp.warmupTimer -= tickDuration;
                    if (comp.warmupTimer <= 0) {
                        comp.activeMaxQps = comp.maxQps;
                        logMessage(`Cluster GKE Prêt [${c.name}]`, `${comp.name} a terminé son warmup et est opérationnel.`, "green");
                    }
                }
            } else if (comp.type === 'compute_run') {
                if (comp.load > 0.85 && comp.activeMaxQps < 150) {
                    if (comp.scalingTimer === undefined) comp.scalingTimer = 0;
                    comp.scalingTimer += 1.33;
                    const scaleThreshold = hasApm ? 1.5 : 3.0;
                    if (comp.scalingTimer >= scaleThreshold) {
                        comp.activeMaxQps = Math.min(150, comp.activeMaxQps + 50);
                        comp.scalingTimer = 0;
                        if (!hasGitops) {
                            state.budget = Math.max(0, state.budget - 15);
                        }
                        logMessage(`Autoscale Cloud Run [${c.name}]`, `${comp.name} scale up à ${comp.activeMaxQps} QPS.`, "info");
                    }
                } else if (comp.load < 0.30 && comp.activeMaxQps > 50) {
                    if (comp.scaleDownTimer === undefined) comp.scaleDownTimer = 0;
                    comp.scaleDownTimer += 1.33;
                    if (comp.scaleDownTimer >= 15.0) {
                        comp.activeMaxQps = Math.max(50, comp.activeMaxQps - 50);
                        comp.scaleDownTimer = 0;
                        logMessage(`Scale Down Cloud Run [${c.name}]`, `${comp.name} scale down à ${comp.activeMaxQps} QPS.`, "info");
                    }
                } else {
                    comp.scalingTimer = 0;
                    comp.scaleDownTimer = 0;
                }
            }
        });
        
        // B. CALCUL DU TRAFIC NET (avec DDoS, DNS, et boosters marketing)
        let ddosTraffic = 0;
        const isDdosActive = c.activeEvents.some(e => e.type === 'DDOS' && (e.graceTimer === 0 || !e.graceTimer));
        if (isDdosActive) {
            if (hasWafGcp) {
                ddosTraffic = 20; // Cloud Armor managé optimal
            } else if (hasWafModSec) {
                ddosTraffic = 40; // ModSecurity VM un peu moins performant
            } else if (state.actions.waf.active && c.id === originalActiveId) {
                ddosTraffic = 30; // WAF global d'urgence actif si c'est le contrat actuellement visible
            } else {
                ddosTraffic = 200;
            }
        }
        
        let baseTraf = c.currentQps;
        if (state.isTutorial && state.tutorialStep === 4 && c.id === 'startup') {
            baseTraf = 80;
        }
        if (c.marketingFlashActive) {
            baseTraf *= 2.0; // Doubler le trafic utilisateur
        }
        
        let incomingTraffic = baseTraf;
        if (incomingTraffic > 0) {
            incomingTraffic += Math.sin(state.time * 0.1) * (incomingTraffic * 0.1);
        }
        incomingTraffic += ddosTraffic;
        
        c.activeEvents.forEach(e => {
            if (e.type === 'UNICORN' && (e.graceTimer === 0 || !e.graceTimer)) incomingTraffic += 100;
        });
        
        state.qps = Math.max(0, incomingTraffic);
        
        // C. CAPACITÉ LB ET INGRESS DROPS
        const lbs = state.infrastructure.components.filter(comp => comp.tier === 'lb');
        const lbCapacity = lbs.reduce((acc, lb) => acc + (lb.maxQps || 0), 0);
        let droppedRequests = 0;
        let activeTraffic = state.qps;
        
        if (state.qps > lbCapacity && lbCapacity > 0) {
            droppedRequests += (state.qps - lbCapacity);
            activeTraffic = lbCapacity;
        } else if (lbCapacity === 0) {
            droppedRequests += state.qps;
            activeTraffic = 0;
        }
        
        // D. BUFFER FILES (QUEUE)
        const queueComps = state.infrastructure.components.filter(comp => comp.tier === 'queue');
        const maxQueueLimit = queueComps.reduce((acc, q) => {
            const metrics = COMPONENT_METRICS[q.type];
            return acc + (metrics ? metrics.maxQueueSize : 0);
        }, 0);
        const computes = state.infrastructure.components.filter(comp => comp.tier === 'compute');
        const computeCapacity = computes.reduce((acc, comp) => acc + (comp.activeMaxQps || comp.maxQps), 0);
        
        let queueLatencyOverhead = 0;
        if (maxQueueLimit > 0) {
            let excessCompute = activeTraffic - computeCapacity;
            if (excessCompute > 0) {
                let spaceInQueue = maxQueueLimit - state.queueSize;
                let toQueue = Math.min(excessCompute, spaceInQueue);
                state.queueSize += toQueue;
                droppedRequests += (excessCompute - toQueue);
                activeTraffic = computeCapacity;
            }
            if (computeCapacity - activeTraffic > 0 && state.queueSize > 0) {
                let drained = Math.min(state.queueSize, computeCapacity - activeTraffic);
                state.queueSize -= drained;
                activeTraffic += drained;
            }
            if (state.queueSize > 0) {
                const avgQueueOverhead = queueComps.reduce((acc, q) => {
                    const metrics = COMPONENT_METRICS[q.type];
                    return acc + (metrics ? metrics.latencyOverhead : 0);
                }, 0) / queueComps.length;
                queueLatencyOverhead = (state.queueSize / maxQueueLimit) * avgQueueOverhead;
            }
            queueComps.forEach(q => {
                const metrics = COMPONENT_METRICS[q.type];
                q.load = Math.min(1.0, state.queueSize / (metrics ? metrics.maxQueueSize : 100));
            });
        } else {
            state.queueSize = 0;
        }
        
        // E. REPARTITION DE CHARGE COMPUTE (LB ALGO)
        if (computes.length === 0) {
            droppedRequests += activeTraffic;
            activeTraffic = 0;
        } else {
            if (state.infrastructure.lbAlgo === 'round-robin') {
                computes.forEach(comp => comp.activeQps = activeTraffic / computes.length);
            } else if (state.infrastructure.lbAlgo === 'least-conn') {
                const totalActiveCap = computes.reduce((acc, comp) => acc + comp.activeMaxQps, 0);
                computes.forEach(comp => comp.activeQps = totalActiveCap > 0 ? (comp.activeMaxQps / totalActiveCap) * activeTraffic : 0);
            } else if (state.infrastructure.lbAlgo === 'fifo') {
                let rem = activeTraffic;
                computes.forEach(comp => {
                    const cap = comp.activeMaxQps;
                    if (rem >= cap) {
                        comp.activeQps = cap;
                        rem -= cap;
                    } else {
                        comp.activeQps = rem;
                        rem = 0;
                    }
                });
                if (rem > 0) {
                    computes.forEach(comp => comp.activeQps += rem / computes.length);
                }
            }
        }
        
        // F. CALCUL DE LA LATENCE
        let currentLatency = 45;
        if (hasCdn) currentLatency -= 15;
        if (hasWafComponent) currentLatency += 5;
        if (state.actions.waf.active && c.id === originalActiveId) currentLatency += 12;
        currentLatency += queueLatencyOverhead;
        
        let computeLatencyContrib = 0;
        computes.forEach(comp => {
            comp.load = comp.activeMaxQps > 0 ? comp.activeQps / comp.activeMaxQps : 0;
            if (comp.activeMaxQps === 0) {
                droppedRequests += comp.activeQps;
            } else if (comp.activeQps > comp.activeMaxQps) {
                const ratio = comp.activeQps / comp.activeMaxQps;
                computeLatencyContrib += ratio * 120 * (comp.activeQps / (activeTraffic || 1));
                if (ratio > 1.25) droppedRequests += (comp.activeQps - comp.activeMaxQps) * 0.4;
            } else {
                computeLatencyContrib += (comp.latencyOverhead || 0) * (comp.activeQps / (activeTraffic || 1));
            }
            if (comp.type === 'compute_lambda') {
                if (comp.prevQps === undefined) comp.prevQps = 0;
                if (comp.activeQps - comp.prevQps > 10) currentLatency += 20;
                comp.prevQps = comp.activeQps;
            }
        });
        currentLatency += computeLatencyContrib;
        
        // G. GESTION DES INCIDENTS DE SECURITÉ
        const leakEvent = c.activeEvents.find(e => e.type === 'CREDENTIALS_LEAK');
        if (leakEvent) {
            const hasVault = state.infrastructure.components.some(comp => comp.type === 'security_vault');
            if (hasVault) {
                leakEvent.durationRemaining = 0;
                logMessage(`Incident mitigé [${c.name}]`, "Vault a intercepté la fuite d'identifiants.", "green");
            } else if (leakEvent.graceTimer === 0 || !leakEvent.graceTimer) {
                state.budget = Math.max(0, state.budget - 35);
                if (state.time % 3 === 0) {
                    logMessage(`Fuite de Secrets [${c.name}]`, "Secrets en clair exploités ! Perte budgétaire en cours. (-35 $)", "danger");
                }
            }
        }
        
        const exploitEvent = c.activeEvents.find(e => e.type === 'CONFIG_EXPLOIT');
        if (exploitEvent) {
            const hasIam = state.infrastructure.components.some(comp => comp.type === 'security_iam' || comp.type === 'security_secretmanager');
            if (hasIam) {
                exploitEvent.durationRemaining = 0;
                logMessage(`Incident mitigé [${c.name}]`, "Escalade IAM bloquée par les rôles d'accès.", "green");
            } else if (exploitEvent.graceTimer === 0 || !exploitEvent.graceTimer) {
                currentLatency += 80;
                if (state.time % 3 === 0) {
                    logMessage(`Exploit Config [${c.name}]`, "Faille IAM active. Latence réseau dégradée. (+80ms)", "danger");
                }
            }
        }
        
        // MONÉTISATION BIGQUERY INDIVIDUELLE
        const hasBigQuery = state.infrastructure.components.some(comp => comp.type === 'ai_bigquery');
        if (hasBigQuery) {
            c.bigqueryTimer = (c.bigqueryTimer || 0) + 1;
            if (c.bigqueryTimer >= 22) {
                state.budget += 60;
                c.bigqueryTimer = 0;
                logMessage(`Monétisation Analytics [${c.name}]`, "Rapports BigQuery vendus (+60 $).", "green");
            }
        }
        
        // H. PERSISTANCE DB
        const dbs = state.infrastructure.components.filter(comp => comp.tier === 'db');
        let dbCapacity = 0;
        dbs.forEach(d => {
            if (d.type === 'db_master') dbCapacity += 150;
            if (d.type === 'db_replica') dbCapacity += 100;
            if (d.type === 'db_spanner') dbCapacity += 1000;
            if (d.type === 'db_sql_postgres') dbCapacity += 300;
            if (d.type === 'db_postgres_vm') dbCapacity += 150;
            if (d.type === 'db_gcs') dbCapacity += 100;
        });
        
        let dbLockedRatio = 1.0;
        if (!hasSpanner) {
            c.activeEvents.forEach(e => {
                if (e.type === 'DB_LOCK' && (e.graceTimer === 0 || !e.graceTimer)) {
                    if (state.actions.dbOpt.cooldown > 0 && c.id === originalActiveId) {
                        // Vacuum actif : pas de blocage
                    } else {
                        dbLockedRatio = 0.3;
                    }
                }
            });
        }
        const activeDbCapacity = dbCapacity * dbLockedRatio;
        const dbTraffic = hasRedisGcp 
            ? state.qps * 0.65 
            : (hasRedisVm ? state.qps * 0.70 : state.qps);
        
        let dbRedisGain = 0;
        if (hasRedisGcp) dbRedisGain = 10;
        else if (hasRedisVm) dbRedisGain = 8;
        currentLatency -= dbRedisGain;
        
        if (dbTraffic > activeDbCapacity && activeDbCapacity > 0) {
            const dbRatio = dbTraffic / activeDbCapacity;
            currentLatency += dbRatio * 200;
            if (dbRatio > 1.3) droppedRequests += (dbTraffic - activeDbCapacity) * 0.3;
        }
        
        dbs.forEach(d => {
            if (d.type === 'db_redis') d.load = Math.min(1.0, (state.qps * 0.35) / 300);
            else if (d.type === 'db_redis_vm') d.load = Math.min(1.0, (state.qps * 0.30) / 200);
            else d.load = activeDbCapacity > 0 ? dbTraffic / activeDbCapacity : 0;
        });
        
        c.activeEvents.forEach(e => {
            if (e.type === 'FIBER_CUT' && (e.graceTimer === 0 || !e.graceTimer)) {
                const cdnMitigation = hasCdn ? 0.9 : 0.0;
                currentLatency += 220 * (1 - cdnMitigation);
            }
        });
        
        // --- LOGIQUE DES NOUVEAUX INCIDENTS V6 ---
        // 1. DNS ATTACK
        const dnsAttack = c.activeEvents.find(e => e.type === 'DNS_ATTACK');
        if (dnsAttack) {
            const hasGlobalLb = state.infrastructure.components.some(comp => comp.type === 'lb_global');
            if (hasGlobalLb || hasWafGcp) {
                dnsAttack.durationRemaining = 0;
                logMessage(`Incident mitigé [${c.name}]`, "Le DNS Anycast Global / Cloud Armor a bloqué l'attaque DNS.", "green");
            } else if (dnsAttack.graceTimer === 0 || !dnsAttack.graceTimer) {
                droppedRequests += state.qps * 0.8;
                activeTraffic *= 0.2;
                if (state.time % 3 === 0) {
                    logMessage(`Attaque DNS [${c.name}]`, "Résolution DNS compromise. 80% du trafic utilisateur échoue.", "danger");
                }
            }
        }
        
        // 2. BRUTE FORCE
        const bruteForce = c.activeEvents.find(e => e.type === 'BRUTE_FORCE');
        if (bruteForce) {
            const hasVault = state.infrastructure.components.some(comp => comp.type === 'security_vault');
            const hasSecretManager = state.infrastructure.components.some(comp => comp.type === 'security_secretmanager');
            if (hasVault || hasSecretManager) {
                bruteForce.durationRemaining = 0;
                logMessage(`Incident mitigé [${c.name}]`, "Rotation des clés active. Tentative brute-force SSH bloquée.", "green");
            } else if (bruteForce.graceTimer === 0 || !bruteForce.graceTimer) {
                computes.forEach(comp => {
                    if (comp.type === 'compute_vm' || comp.id.includes('initial_1')) {
                        comp.load = Math.min(1.0, comp.load + 0.4);
                        comp.activeQps = Math.min(comp.activeMaxQps, comp.activeQps * 1.5);
                    }
                });
                currentLatency += 50;
                if (state.time % 3 === 0) {
                    logMessage(`Brute Force SSH [${c.name}]`, "Attaque force brute active sur les VM. Surcharge CPU +40% et latence +50ms.", "danger");
                }
            }
        }
        
        // 3. DISK FULL
        const diskFull = c.activeEvents.find(e => e.type === 'DISK_FULL');
        if (diskFull) {
            const hasCloudSql = state.infrastructure.components.some(comp => comp.type === 'db_sql_postgres');
            const hasSpanner = state.infrastructure.components.some(comp => comp.type === 'db_spanner');
            const vacuumActive = state.actions.dbOpt.cooldown > 0 && c.id === originalActiveId;
            if (hasCloudSql || hasSpanner || vacuumActive) {
                diskFull.durationRemaining = 0;
                if (vacuumActive) {
                    logMessage(`Incident résolu [${c.name}]`, "Vacuum d'urgence exécuté. Espace disque libéré sur la base.", "green");
                } else {
                    logMessage(`Incident mitigé [${c.name}]`, "Stockage DB managé (Cloud SQL/Spanner) étendu automatiquement.", "green");
                }
            } else if (diskFull.graceTimer === 0 || !diskFull.graceTimer) {
                currentLatency += 300;
                droppedRequests += state.qps * 0.5;
                if (state.time % 3 === 0) {
                    logMessage(`Disque DB Plein [${c.name}]`, "Postgres VM saturé. Latence +300ms, 50% de drops. Exécutez Vacuum [D] ou migrez vers Cloud SQL.", "danger");
                }
            }
        }
        
        // 4. ZONE OUTAGE
        const zoneOutage = c.activeEvents.find(e => e.type === 'ZONE_OUTAGE');
        if (zoneOutage) {
            let vulnerableComputes = computes.filter(comp => comp.type === 'compute_vm' || comp.id.includes('initial_1'));
            let vulnerableDbs = dbs.filter(comp => comp.type === 'db_postgres_vm' || comp.type === 'db_master');
            if (vulnerableComputes.length === 0 && vulnerableDbs.length === 0) {
                zoneOutage.durationRemaining = 0;
                logMessage(`Incident mitigé [${c.name}]`, "Calcul et Données redondés multi-zone. Panne de zone évitée.", "green");
            } else if (zoneOutage.graceTimer === 0 || !zoneOutage.graceTimer) {
                vulnerableComputes.forEach(comp => {
                    comp.activeMaxQps = Math.floor(comp.maxQps * 0.2);
                });
                vulnerableDbs.forEach(db => {
                    dbLockedRatio = Math.min(dbLockedRatio, 0.2);
                });
                if (state.time % 3 === 0) {
                    logMessage(`Panne de Zone [${c.name}]`, "Zone Outage active. VM et bases Postgres locales bridées à 20% de capacité ! Migrez vers Cloud Run/GKE/Spanner.", "danger");
                }
            }
        }
        
        if (hasTrace) currentLatency *= 0.9;
        if (hasVertex) currentLatency += 25;
        
        state.latency = state.qps === 0 ? 0 : Math.max(0, currentLatency);
        
        // I. TIMEOUT ET MISE A JOUR DU SLA
        let latencyDropped = 0;
        if (state.latency > 200) {
            const timeoutRatio = Math.min(1.0, (state.latency - 200) / 300);
            latencyDropped = (state.qps - droppedRequests) * 0.75 * timeoutRatio;
        }
        
        const processedSuccess = Math.max(0, state.qps - droppedRequests - latencyDropped);
        let successRatio = state.qps > 0 ? (processedSuccess / state.qps) : 1.0;
        
        // DELAI DE GRÂCE :
        // Si gracePeriodTimer > 0, on force successRatio à 1.0 pour laisser un délai de réaction
        if (c.gracePeriodTimer > 0) {
            successRatio = 1.0;
        }
        
        state.slaWindow[state.slaWindowIndex] = successRatio;
        state.slaWindowIndex = (state.slaWindowIndex + 1) % 20; // 20 ticks glissants
        
        const slaSum = state.slaWindow.reduce((a, b) => a + b, 0);
        let calculatedSla = (slaSum / state.slaWindow.length) * 100;
        
        // RECUPERATION SLA ACCELEREE :
        // Si successRatio est parfait, on remonte le SLA de façon agressive en nettoyant les valeurs dégradées de la fenêtre
        if (successRatio === 1.0 && calculatedSla < 100.0) {
            const recoveryBoost = hasChaosMesh ? 2.5 : 1.5; // +2.5% ou +1.5% par tick
            let incrementNeeded = recoveryBoost / 5;
            for (let i = 0; i < state.slaWindow.length; i++) {
                if (state.slaWindow[i] < 1.0) {
                    const available = 1.0 - state.slaWindow[i];
                    const add = Math.min(available, incrementNeeded);
                    state.slaWindow[i] += add;
                    incrementNeeded -= add;
                    if (incrementNeeded <= 0) break;
                }
            }
            const newSlaSum = state.slaWindow.reduce((a, b) => a + b, 0);
            calculatedSla = (newSlaSum / state.slaWindow.length) * 100;
        }
        state.sla = calculatedSla;
        
        // --- LOGIQUE DE CONFIANCE CLIENT INDIVIDUELLE ---
        let securityEvents = 0;
        let degradationEvents = 0;
        if (c.activeEvents) {
            c.activeEvents.forEach(e => {
                if ((e.graceTimer === 0 || e.graceTimer === undefined) && e.durationRemaining > 0) {
                    if (e.level === 'securite') securityEvents++;
                    else if (e.level === 'degradation') degradationEvents++;
                }
            });
        }
        
        let trustChange = 0;
        const isSlaBreached = c.sla < c.requiredSla;
        
        if (isSlaBreached) {
            trustChange -= 1.5;
        }
        if (securityEvents > 0) {
            trustChange -= 2.0 * securityEvents;
        }
        if (degradationEvents > 0) {
            trustChange -= 1.0 * degradationEvents;
        }
        
        // Si aucun incident majeur et SLA nominal, la confiance augmente
        if (!isSlaBreached && securityEvents === 0 && degradationEvents === 0) {
            trustChange += 0.75;
        }
        
        c.trust = Math.max(0, Math.min(100, (c.trust || 50.0) + trustChange));
        
        if (trustChange < 0 && state.time % 3 === 0) {
            logMessage(`Confiance en baisse [${c.name}]`, `Baisse de confiance client de ${trustChange.toFixed(1)}% due à des incidents ou rupture de SLA. Confiance actuelle : ${Math.round(c.trust)}%.`, "danger");
        }
        
        // Rupture unilatérale si confiance === 0
        if (c.trust <= 0) {
            c.signed = false;
            c.breachTimer = 0;
            const penalty = Math.floor(c.revenue * 3);
            state.budget = Math.max(0, state.budget - penalty);
            logMessage("RUPTURE DE CONFIANCE CLIENT", `Le client '${c.name}' a résilié suite à perte totale de confiance (0%). Amende : ${formatNumber(penalty)} $.`, "danger");
            addTemporaryNotification("Contrat Résilié", `Confiance client à 0% sur ${c.name}. Amende de ${formatNumber(penalty)} $.`, "danger", 7000);
            
            if (state.activeContractId === c.id) {
                const alternative = state.contracts.find(alt => alt.signed);
                state.activeContractId = alternative ? alternative.id : 'startup';
            }
            
            updateNodePositions();
            return; // Passer directement au contrat suivant
        }
        
        // J. CALCUL DES REVENUS ET CHARGES DE MAINTENANCE
        let currentSlaModifier = 1.0;
        if (state.sla < 99.9) currentSlaModifier = 0.8;
        if (state.sla < 99.0) currentSlaModifier = 0.5;
        if (state.sla < 95.0) currentSlaModifier = 0.1;
        
        let income = c.currentRevenue * currentSlaModifier;
        if (hasVertex) {
            income *= 1.25; // Vertex AI Gateway bonus de +25%
        }
        
        // Multiplicateur de confiance client individuelle
        income *= c.trust / 100;
        
        totalIncomeThisTick += income;
        
        let maint = 0;
        state.infrastructure.components.forEach(comp => {
            maint += comp.maintenance || 0;
        });
        if (state.infrastructure.cdnActive) {
            maint += state.infrastructure.cdnMaintenance || 2;
        }
        totalMaintenanceThisTick += maint;
        
        // K. RUPTURE DE CONTRAT (SLA insuffisant prolongé)
        if (state.sla < c.requiredSla) {
            c.breachTimer++;
            if (c.breachTimer >= 10) {
                c.signed = false;
                const penalty = Math.floor(c.currentRevenue * 25);
                state.budget = Math.max(0, state.budget - penalty);
                logMessage("CONTRAT RÉSILIÉ D'OFFICE (SLA)", `Le client '${c.name}' a résilié suite à SLA insuffisant. Amende : ${formatNumber(penalty)} $.`, "danger");
                addTemporaryNotification("Contrat Résilié", `${c.name} est parti. Amende de ${formatNumber(penalty)} $.`, "danger", 7000);
            } else {
                if (state.time % 2 === 0) {
                    logMessage("Rupture de SLA imminente", `Le client '${c.name}' exige un SLA >= ${c.requiredSla}%. Résiliation dans ${10 - c.breachTimer}s !`, "danger");
                }
            }
        } else {
            c.breachTimer = 0;
        }
        
        // Si c'est le contrat visible, enregistrer les finances et flux réseaux pour l'affichage cockpit
        if (c.id === originalActiveId) {
            state.lastFinancials = {
                contractIncome: income,
                slaModifier: currentSlaModifier,
                totalIncome: income,
                maintenanceCost: maint,
                lbCost: state.infrastructure.components.filter(comp => comp.tier === 'lb').reduce((acc, comp) => acc + comp.maintenance, 0),
                computeCost: state.infrastructure.components.filter(comp => comp.tier === 'compute').reduce((acc, comp) => acc + comp.maintenance, 0),
                dbCost: state.infrastructure.components.filter(comp => comp.tier === 'db').reduce((acc, comp) => acc + comp.maintenance, 0),
                cdnCost: state.infrastructure.cdnActive ? (state.infrastructure.cdnMaintenance || 2) : 0,
                autoscaleCost: 0,
                netProfit: income - maint
            };
            
            state.lastNetworkDetails = {
                baseQps: c.currentQps,
                ddosQps: isDdosActive ? 200 : 0,
                unicornQps: c.activeEvents.some(e => e.type === 'UNICORN') ? 100 : 0,
                wafBlocked: (hasWafComponent || state.actions.waf.active) && isDdosActive ? (200 - ddosTraffic) : 0,
                lbCapacity: lbCapacity,
                computeCapacity: computes.reduce((acc, comp) => acc + comp.activeMaxQps, 0),
                dbCapacity: dbCapacity,
                droppedRequests: droppedRequests,
                latencyDropped: latencyDropped
            };
        }
    });
    
    // Restaurer le contrat sélectionné par l'utilisateur
    state.activeContractId = originalActiveId;
    
    // Calcul de la confiance globale (state.trust) : moyenne de la confiance des contrats signés (ou 100% si aucun contrat n'est actif)
    const signedContracts = state.contracts.filter(c => c.signed);
    if (signedContracts.length > 0) {
        const sumTrust = signedContracts.reduce((sum, c) => sum + c.trust, 0);
        state.trust = sumTrust / signedContracts.length;
    } else {
        state.trust = 100.0;
    }
    
    // Appliquer le flux financier net global de ce tick sur le budget de la compagnie
    state.budget = Math.max(0, state.budget + totalIncomeThisTick - totalMaintenanceThisTick);
    
    // --- CONDITIONS DE DEFAITE & VICTOIRE ---
    if (state.trust <= 0) {
        triggerGameOver("Faillite de Confiance Client", "Vos clients ont perdu toute confiance dans votre infrastructure suite à des brèches de sécurité répétées non résolues.");
        return;
    }
    
    if (state.budget <= 0) {
        triggerGameOver("Faillite Financière", "Votre budget est tombé à 0 $. Suite aux amendes de SLA et aux coûts de maintenance de vos multiples infrastructures, votre entreprise cloud a été liquidée.");
        return;
    }
    
    // Victoire : Contrat ultime "saas_ai" signé et son SLA stable >= 99.95% pendant 30 secondes (soit environ 23 ticks)
    const saasContract = state.contracts.find(c => c.id === 'saas_ai');
    const progressEl = document.getElementById('victory-hold-progress');
    
    if (saasContract && saasContract.signed) {
        const saaSla = saasContract.sla;
        if (saaSla >= 99.95) {
            saasContract.victoryHoldTimer = (saasContract.victoryHoldTimer || 0) + 1;
            
            // Progression en secondes (hold timer multiplié par 1.33s par tick)
            const secondsHeld = Math.min(30, Math.floor(saasContract.victoryHoldTimer * 1.33));
            if (progressEl) {
                progressEl.innerText = `${secondsHeld}/30s`;
            }
            
            if (saasContract.victoryHoldTimer * 1.33 >= 30) {
                triggerGameVictory();
                return;
            } else {
                if (saasContract.victoryHoldTimer % 4 === 0) {
                    logMessage("Objectif de Victoire", `SaaS Enterprise stable à ${saaSla.toFixed(2)}% de SLA. Progression : ${secondsHeld}/30s`, "info");
                }
            }
        } else {
            if (saasContract.victoryHoldTimer > 0) {
                saasContract.victoryHoldTimer = 0;
                if (progressEl) progressEl.innerText = "0/30s";
                logMessage("Compteur de Victoire Réinitialisé", "La latence ou les requêtes perdues sur le SaaS AI ont fait chuter son SLA en dessous de 99.95% ! Le chrono repart à 0.", "warning");
            }
        }
    } else {
        if (progressEl) progressEl.innerText = "0/30s";
    }
    
    // Déterminer le statut de crise (status = INCIDENT si au moins un contrat signé subit un incident)
    let globalCrisis = false;
    state.contracts.forEach(c => {
        if (c.signed && (c.activeEvents.length > 0 || c.sla < c.requiredSla)) {
            globalCrisis = true;
        }
    });
    state.status = globalCrisis ? 'INCIDENT' : 'NOMINAL';
    
    // Statistiques globales
    if (state.stats) {
        state.stats.maxBudget = Math.max(state.stats.maxBudget, state.budget);
        state.stats.slaSum += state.sla;
        state.stats.slaTicks++;
    }
    
    updateUIElements();
    renderContractsList();
}

function saveRun(isVictory) {
    const avgSla = state.stats.slaTicks > 0 ? (state.stats.slaSum / state.stats.slaTicks) : state.sla;
    
    // Calcul d'un score standardisé cyberpunk
    let score = (isVictory ? 10000 : 0) + 
                (state.time * 50) + 
                (state.stats.maxQps * 20) + 
                (state.budget * 0.1) + 
                (avgSla * 100) - 
                (state.stats.incidentsCount * 100);
    score = Math.max(0, Math.round(score));
    
    const newRun = {
        date: new Date().toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }),
        isVictory: isVictory,
        duration: state.time,
        maxBudget: state.stats.maxBudget,
        maxQps: state.stats.maxQps,
        avgSla: avgSla,
        score: score
    };
    
    let history = [];
    try {
        const stored = localStorage.getItem('cct_runs_history');
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Erreur lecture localStorage", e);
    }
    
    // Insérer en haut de la liste
    history.unshift(newRun);
    
    // Garder seulement les 5 derniers runs pour comparaison
    if (history.length > 5) {
        history = history.slice(0, 5);
    }
    
    try {
        localStorage.setItem('cct_runs_history', JSON.stringify(history));
    } catch (e) {
        console.error("Erreur écriture localStorage", e);
    }
    
    return { newRun, history };
}

function displayRunsHistory(currentRun, history) {
    const avgSlaCurrent = state.stats.slaTicks > 0 ? (state.stats.slaSum / state.stats.slaTicks) : state.sla;
    
    // Mettre à jour les stats instantanées du run dans le dashboard
    document.getElementById('stat-time').innerText = `${state.time}s`;
    document.getElementById('stat-max-budget').innerText = `${formatNumber(state.stats.maxBudget)} $`;
    document.getElementById('stat-max-qps').innerText = `${formatNumber(state.stats.maxQps)} QPS`;
    document.getElementById('stat-avg-sla').innerText = `${avgSlaCurrent.toFixed(2)}%`;
    document.getElementById('stat-incidents').innerText = state.stats.incidentsCount;
    document.getElementById('stat-actions').innerText = state.stats.actionsCount;
    
    // Trouver le meilleur score historique pour le badge
    let highestScore = 0;
    history.forEach(run => {
        if (run.score > highestScore) {
            highestScore = run.score;
        }
    });
    
    const tbody = document.getElementById('runs-history-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    history.forEach(run => {
        const isHighScore = run.score === highestScore && run.score > 0;
        const resultText = run.isVictory 
            ? '<span style="color: var(--green); font-weight: bold;">VICTOIRE</span>' 
            : '<span style="color: var(--red); font-weight: bold;">ÉCHEC</span>';
            
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(0, 240, 255, 0.1)';
        tr.innerHTML = `
            <td style="padding: 0.4rem 0.6rem; color: #a1a1aa;">${run.date}</td>
            <td style="padding: 0.4rem 0.6rem;">${resultText}</td>
            <td style="padding: 0.4rem 0.6rem; color: #a1a1aa;">${run.duration}s</td>
            <td style="padding: 0.4rem 0.6rem; color: #a1a1aa;">${formatNumber(run.maxBudget)} $</td>
            <td style="padding: 0.4rem 0.6rem; color: #a1a1aa;">${formatNumber(run.maxQps)} QPS</td>
            <td style="padding: 0.4rem 0.6rem; color: #a1a1aa;">${run.avgSla.toFixed(2)}%</td>
            <td style="padding: 0.4rem 0.6rem; text-align: right; color: var(--cyan); font-weight: bold;">
                ${run.score} pts${isHighScore ? '<span style="color: var(--green); margin-left: 0.2rem; text-shadow: 0 0 5px var(--green);">⭐ RECORD</span>' : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function triggerGameOver(title, desc) {
    state.gameOver = true;
    state.gameStarted = false;
    
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
    
    const endTitle = document.getElementById('game-end-title');
    const endDesc = document.getElementById('game-end-desc');
    
    endTitle.innerText = `🔴 ÉCHEC : ${title}`;
    endTitle.style.color = 'var(--red)';
    endDesc.innerHTML = `<p>${desc}</p><p>Temps survécu : <strong>${state.time} secondes</strong>.</p>`;
    
    const { newRun, history } = saveRun(false);
    displayRunsHistory(newRun, history);
    
    document.getElementById('game-end-modal').style.display = 'flex';
}

function triggerGameVictory() {
    state.victory = true;
    state.gameStarted = false;
    
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
    
    const endTitle = document.getElementById('game-end-title');
    const endDesc = document.getElementById('game-end-desc');
    
    endTitle.innerText = `🟢 VICTOIRE DE LA MISSION`;
    endTitle.style.color = 'var(--green)';
    endDesc.innerHTML = `
        <p>Félicitations ! Vous avez prouvé vos compétences d'<strong>Architecte Cloud Principal</strong>.</p>
        <p>Vous avez signé et stabilisé le contrat d'hébergement ultra-critique de <strong>SaaS Enterprise AI</strong> pendant 30 secondes sans faillir.</p>
        <p>Temps total de la partie : <strong>${state.time} secondes</strong>.<br>Budget final : <strong>${formatNumber(state.budget)} $</strong>.</p>
    `;
    
    const { newRun, history } = saveRun(true);
    displayRunsHistory(newRun, history);
    
    document.getElementById('game-end-modal').style.display = 'flex';
}

function triggerRandomChaos() {
    if (state.chaosCooldown > 0) return;
    
    const signedContracts = state.contracts.filter(c => c.signed);
    if (signedContracts.length === 0) return;
    
    const randomContract = signedContracts[Math.floor(Math.random() * signedContracts.length)];
    
    if (randomContract.activeEvents.length === 0 && Math.random() < 0.06) {
        const eventsPool = [
            {
                type: 'DDOS',
                name: 'Attaque Volumétrique DDoS',
                desc: 'Un botnet cible vos serveurs ! Activez le WAF ou installez Cloud Armor.',
                duration: 18,
                level: 'degradation',
                graceDuration: 5
            },
            {
                type: 'FIBER_CUT',
                name: 'Section de Câble Réseau Transatlantique',
                desc: 'Latence mondiale accrue de 220ms. Atténué par votre CDN.',
                duration: 15,
                level: 'degradation',
                graceDuration: 5
            },
            {
                type: 'DB_LOCK',
                name: 'Deadlock sur Transactions SQL',
                desc: 'Base de données saturée de verrous. Déclenchez l\'optimisation Vacuum DB [D].',
                duration: 18,
                level: 'degradation',
                graceDuration: 5
            },
            {
                type: 'UNICORN',
                name: 'Mise en avant sur Product Hunt',
                desc: 'Afflux de trafic inattendu (+100 QPS) ! Vérifiez votre calcul ou autoscaling.',
                duration: 20,
                level: 'degradation',
                graceDuration: 5
            },
            {
                type: 'CREDENTIALS_LEAK',
                name: 'Fuite de Clés d\'API',
                desc: 'Des secrets ont fuité publiquement ! Mitigé par Secret Manager ou Vault.',
                duration: 15,
                level: 'securite',
                graceDuration: 5
            },
            {
                type: 'CONFIG_EXPLOIT',
                name: 'Exploit Fail de Configuration IAM',
                desc: 'Tentative d\'escalade de privilèges. Mitigé par des politiques de sécurité strictes.',
                duration: 15,
                level: 'securite',
                graceDuration: 5
            },
            {
                type: 'DNS_ATTACK',
                name: 'Empoisonnement DNS Réseau',
                desc: 'Le cache DNS est attaqué. Mitigé par un WAF managé ou Load Balancer Global.',
                duration: 15,
                level: 'degradation',
                graceDuration: 5
            },
            {
                type: 'BRUTE_FORCE',
                name: 'Brute Force SSH sur Compute',
                desc: 'Tentatives d\'intrusion sur vos VM. Chiffrez les clés avec Secret Manager ou Vault.',
                duration: 18,
                level: 'alerte',
                graceDuration: 5
            },
            {
                type: 'DISK_FULL',
                name: 'Espace Disque SQL Plein',
                desc: 'Disque de la VM SQL plein. Migratez vers Cloud SQL Postgres ou lancez Vacuum [D].',
                duration: 20,
                level: 'alerte',
                graceDuration: 5
            },
            {
                type: 'ZONE_OUTAGE',
                name: 'Panne de Zone Physique (Outage)',
                desc: 'Panne locale. Affecte VM et DB uniques. Mitigé par des instances multizones (Cloud Run/GKE/Spanner).',
                duration: 15,
                level: 'degradation',
                graceDuration: 5
            }
        ];
        
        const selected = eventsPool[Math.floor(Math.random() * eventsPool.length)];
        
        randomContract.activeEvents.push({
            type: selected.type,
            name: selected.name,
            durationRemaining: selected.duration,
            level: selected.level,
            graceTimer: selected.graceDuration
        });
        
        if (state.stats) state.stats.incidentsCount++;
        
        const isWarning = selected.level === 'alerte';
        const isSecurity = selected.level === 'securite';
        const logType = isSecurity ? 'security' : (isWarning ? 'warning' : 'danger');
        
        logMessage(
            isSecurity ? "INCIDENT SÉCURITÉ" : (isWarning ? "ALERTE SYSTÈME" : "PANNE DE SERVICE"), 
            `[${randomContract.name}] ${selected.name} : ${selected.desc}`, 
            logType
        );
        addTemporaryNotification(
            `${isSecurity ? '🔒 Sécurité' : (isWarning ? '⚠️ Alerte' : '🚨 Dégradation')} : ${selected.name}`, 
            `Client impacté : ${randomContract.name}. ${selected.desc}`, 
            logType, 
            8000
        );
        
        updateUIElements();
        renderContractsList();
    }
}

// --- CANVAS VISUALIZATION RENDERING ---
let canvas, ctx;
let nodes = {};
let particles = [];
let mouseX = 0, mouseY = 0;
let hoveredNode = null;

// Variables pour le déplacement des nœuds (Drag and Drop)
let draggingNodeId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function initCanvas() {
    canvas = document.getElementById('network-map');
    ctx = canvas.getContext('2d');
    
    window.addEventListener('resize', resizeCanvas);
    
    // Événements souris pour le Drag-and-Drop manuel des nœuds
    canvas.addEventListener('mousedown', (e) => {
        if (state.gameOver || state.victory) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // 1. Ne pas déplacer si on clique sur la croix de suppression du composant sélectionné
        let clickedDeleteBtn = false;
        if (selectedComponentId && selectedComponentId !== 'lb') {
            const comp = state.infrastructure.components.find(c => c.id === selectedComponentId);
            if (comp) {
                const btnX = comp.x + comp.radius * 0.9;
                const btnY = comp.y - comp.radius * 0.9;
                const distBtn = Math.hypot(clickX - btnX, clickY - btnY);
                if (distBtn < 10) {
                    clickedDeleteBtn = true;
                }
            }
        }
        if (clickedDeleteBtn) return;
        
        // 2. Chercher si le clic se situe sur un composant d'infrastructure
        let clickedComp = null;
        state.infrastructure.components.forEach(c => {
            const dist = Math.hypot(clickX - c.x, clickY - c.y);
            if (dist < (c.radius || 18) + 12) {
                clickedComp = c;
            }
        });
        
        if (clickedComp) {
            draggingNodeId = clickedComp.id;
            dragOffsetX = clickX - clickedComp.x;
            dragOffsetY = clickY - clickedComp.y;
            selectComponent(clickedComp.id);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        trackMousePos(e);
        
        if (draggingNodeId) {
            const rect = canvas.getBoundingClientRect();
            const mouseCanvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseCanvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            const comp = state.infrastructure.components.find(c => c.id === draggingNodeId);
            if (comp) {
                // Déplacer le nœud librement en le restreignant aux bordures du canvas
                const r = comp.radius || 16;
                comp.x = Math.max(r, Math.min(canvas.width - r, mouseCanvasX - dragOffsetX));
                comp.y = Math.max(r, Math.min(canvas.height - r, mouseCanvasY - dragOffsetY));
                
                // Sauvegarder les ratios pour conserver la position après redimensionnement
                comp.relativeX = comp.x / canvas.width;
                comp.relativeY = comp.y / canvas.height;
                comp.dragged = true;
                
                // Mettre à jour l'entité dessinée
                if (nodes[comp.id]) {
                    nodes[comp.id].x = comp.x;
                    nodes[comp.id].y = comp.y;
                }
            }
        }
    });
    
    const stopDragging = () => {
        draggingNodeId = null;
    };
    
    canvas.addEventListener('mouseup', stopDragging);
    canvas.addEventListener('mouseleave', stopDragging);
    
    // Événements clavier globaux
    window.addEventListener('keydown', (e) => {
        // Ignorer si l'utilisateur est dans un champ de texte/sélection
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        const zoneKeys = {
            '1': 'wan',
            '2': 'lb',
            '3': 'queue',
            '4': 'compute',
            '5': 'db',
            '6': 'security',
            '7': 'cicd',
            '8': 'monitoring',
            '9': 'ai',
            '0': 'chaos'
        };
        if (e.key in zoneKeys) {
            const zone = zoneKeys[e.key];
            const category = TIER_TO_CATEGORY[zone];
            if (category) {
                activateCatalogFilter(category);
                state.highlightedZone = zone;
                state.highlightedZoneTimer = 30; // 30 frames de clignotement
            }
            return;
        }

        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault(); // Évite le défilement de la page
            if (state.gameSpeed > 0) {
                state.previousActiveSpeed = state.gameSpeed;
                setGameSpeed(0);
            } else {
                setGameSpeed(state.previousActiveSpeed || 1);
            }
            return;
        }
        
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId && selectedComponentId !== 'lb') {
            const comp = state.infrastructure.components.find(c => c.id === selectedComponentId);
            if (comp) {
                if (comp.type === 'db_master') {
                    const hasAlternativeDb = state.infrastructure.components.some(c => c.type === 'db_spanner' || c.type === 'db_sql_postgres');
                    if (!hasAlternativeDb) {
                        logMessage("Démantèlement bloqué", "Vous devez d'abord acheter Cloud Spanner ou Cloud SQL Postgres avant de pouvoir détruire le Master SQL Postgres d'origine.", "warning");
                        return;
                    }
                }
                sellComponent(comp.id);
            }
        }
    });
    
    resizeCanvas();
}

function getDistanceToSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.hypot(dx, dy);
}

function trackMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    let foundNode = null;
    Object.keys(nodes).forEach(key => {
        const node = nodes[key];
        const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
        if (dist < node.radius + 15) {
            foundNode = key;
        }
    });
    
    let foundPath = null;
    // Si aucun nœud n'est survolé, vérifier si on survole un segment réseau (câble)
    if (!foundNode) {
        const paths = getDynamicPathways();
        for (let i = 0; i < paths.length; i++) {
            const p = paths[i];
            if (!p.from || !p.to) continue;
            const dist = getDistanceToSegment(mouseX, mouseY, p.from.x, p.from.y, p.to.x, p.to.y);
            if (dist < 12) { // tolérance de 12px
                foundPath = p;
                break;
            }
        }
    }
    
    state.hoveredPath = foundPath;
    
    let hoveredDeleteBtn = false;
    if (selectedComponentId && selectedComponentId !== 'lb') {
        const comp = state.infrastructure.components.find(c => c.id === selectedComponentId);
        if (comp) {
            const btnX = comp.x + comp.radius * 0.9;
            const btnY = comp.y - comp.radius * 0.9;
            const distBtn = Math.hypot(mouseX - btnX, mouseY - btnY);
            if (distBtn < 10) {
                hoveredDeleteBtn = true;
            }
        }
    }
    
    if (foundNode || foundPath || hoveredDeleteBtn) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
    
    let nextHoveredState = foundNode;
    if (!foundNode && foundPath) {
        nextHoveredState = 'path_' + foundPath.type;
    }
    
    if (nextHoveredState !== hoveredNode) {
        hoveredNode = nextHoveredState;
        updateHoverDetails();
    }
}

function updateHoverDetails() {
    return; // Désactivé : le panneau d'audit au survol (#overlay-info) a été supprimé pour améliorer la lisibilité.
    
    if (!hoveredNode) {
        overlay.style.display = 'none';
        return;
    }
    
    overlay.style.display = 'block';
    
    // Intercepter l'audit didactique survol de lien réseau (câble)
    if (hoveredNode.startsWith('path_')) {
        const pathType = hoveredNode.split('_')[1]; // wan, lb, queue, compute, db
        let title = "";
        let desc = "";
        let audits = [];
        
        const hasWaf = state.infrastructure.components.some(c => c.type === 'waf');
        const hasCdn = state.infrastructure.cdnActive || state.infrastructure.components.some(c => c.type === 'cdn');
        const hasIam = state.infrastructure.components.some(c => c.type === 'security_iam');
        const hasVault = state.infrastructure.components.some(c => c.type === 'security_vault');
        const hasApm = state.infrastructure.components.some(c => c.type === 'monitoring_apm');
        const hasGitops = state.infrastructure.components.some(c => c.type === 'cicd_gitops');
        const hasChaos = state.infrastructure.components.some(c => c.type === 'chaos_mesh');

        if (pathType === 'wan') {
            title = "🌐 Liaison WAN / Ingress (Périphérie)";
            desc = "Lien reliant les utilisateurs externes à la périphérie du réseau (Edge). C'est le point d'entrée principal de tout le trafic.";
            audits = [
                { name: "Cloud Armor WAF (anti-DDoS)", status: hasWaf ? 'active' : 'missing', text: "Filtre passivement les requêtes malveillantes lors d'une attaque DDoS." },
                { name: "Cloud CDN (Cache périphérique)", status: hasCdn ? 'active' : 'missing', text: "Met en cache les requêtes statiques pour soulager les serveurs." },
                { name: "HashiCorp Vault (Secrets)", status: 'na', text: "Inapplicable sur la liaison Ingress." },
                { name: "Politiques IAM (Accès)", status: 'na', text: "Inapplicable sur la liaison Ingress." }
            ];
        } else if (pathType === 'lb') {
            title = "⚖️ Liaison Ingress / Load Balancing";
            desc = "Lien acheminant le trafic périphérique vers le répartiteur de charge pour équilibrer le flux.";
            audits = [
                { name: "Cloud Armor WAF (anti-DDoS)", status: hasWaf ? 'active' : 'missing', text: "Protège le point d'aiguillage des requêtes d'Ingress." },
                { name: "Règles IAM (Sécurité réseau)", status: hasIam ? 'active' : 'missing', text: "Applique des restrictions de sécurité sur le trafic entrant." },
                { name: "HashiCorp Vault (Secrets)", status: 'na', text: "Inapplicable sur le Load Balancer." }
            ];
        } else if (pathType === 'queue') {
            title = "📨 Liaison Queue / Buffer de flux";
            desc = "Lien acheminant le surplus de trafic vers les files d'attente asynchrones pour lisser la charge.";
            audits = [
                { name: "Politiques IAM (Accès Queue)", status: hasIam ? 'active' : 'missing', text: "Restreint les autorisations de lecture/écriture dans la file." },
                { name: "Supervision Prometheus (APM)", status: hasApm ? 'active' : 'missing', text: "Surveille le taux de remplissage du buffer pour prévenir les pertes de paquets." },
                { name: "Cloud Armor WAF (anti-DDoS)", status: 'na', text: "Inapplicable dans le sous-réseau interne." }
            ];
        } else if (pathType === 'compute') {
            title = "⚙️ Liaison Calcul / Traitement Applicatif";
            desc = "Lien transmettant les requêtes aux instances de calcul pour l'exécution du code métier.";
            audits = [
                { name: "Politiques IAM (Moindre privilège)", status: hasIam ? 'active' : 'missing', text: "Empêche l'accès non autorisé et les escalades de privilèges sur vos VM/conteneurs." },
                { name: "Pipeline DevOps GitOps (ArgoCD)", status: hasGitops ? 'active' : 'missing', text: "Assure que le code exécuté est audité et conforme au dépôt Git." },
                { name: "Supervision Prometheus (APM)", status: hasApm ? 'active' : 'missing', text: "Surveille les métriques CPU pour déclencher l'autoscaling optimal." }
            ];
        } else if (pathType === 'db') {
            title = "🛢️ Liaison Données / Persistance Database";
            desc = "Lien critique transmettant les requêtes de persistance SQL ou NoSQL vers les bases de données.";
            audits = [
                { name: "HashiCorp Vault (Secrets DB)", status: hasVault ? 'active' : 'missing', text: "Chiffre les identifiants et chaînes de connexion de la base de données." },
                { name: "Politiques IAM (Accès Table)", status: hasIam ? 'active' : 'missing', text: "Restreint l'accès aux données sensibles aux seuls microservices autorisés." },
                { name: "Chaos Mesh Daemon (Résilience)", status: hasChaos ? 'active' : 'missing', text: "Simule des perturbations réseau et SQL pour valider le basculement automatique." }
            ];
        }
        
        titleEl.innerText = title;
        
        let html = `<p style="font-size:0.75rem; color:var(--color-muted); line-height:1.4; margin-bottom:0.5rem;">${desc}</p>`;
        html += `<div style="font-weight:bold; font-size:0.72rem; color:var(--cyan); margin-top:0.4rem; text-transform:uppercase;">Audit de Sécurité Réseau :</div>`;
        html += `<ul class="security-audit-list" style="padding-left:0; margin:0.3rem 0 0 0;">`;
        
        audits.forEach(audit => {
            let icon = "";
            let styleClass = "";
            if (audit.status === 'active') {
                icon = '<span style="color:var(--green); margin-right:6px;">✅ [ACTIF]</span>';
                styleClass = 'security-audit-item active';
            } else if (audit.status === 'missing') {
                icon = '<span style="color:var(--red); margin-right:6px;">❌ [ABSENT]</span>';
                styleClass = 'security-audit-item missing';
            } else {
                icon = '<span style="color:var(--color-muted); margin-right:6px; text-decoration:line-through;">🚫 [N/A]</span>';
                styleClass = 'security-audit-item na';
            }
            
            html += `<li class="${styleClass}" style="margin-bottom:6px; list-style:none; line-height:1.3;">
                <div style="font-weight:600; font-size:0.74rem;">${icon}${audit.name}</div>
                <div style="font-size:0.68rem; padding-left:18px; color:rgba(255,255,255,0.6);">${audit.text}</div>
            </li>`;
        });
        
        html += `</ul>`;
        descEl.innerHTML = html;
        return;
    }
    
    if (hoveredNode === 'users') {
        titleEl.innerText = "🌐 Internet Public (Clients)";
        descEl.innerText = `Trafic total émis : ${Math.round(state.qps)} QPS. Flux généré par l'ensemble des contrats de services signés.`;
        return;
    }
    
    const comp = state.infrastructure.components.find(c => c.id === hoveredNode);
    if (!comp) return;
    
    const metrics = COMPONENT_METRICS[comp.type] || { name: comp.name, maxQps: 150 };
    const loadPercent = Math.round((comp.load || 0) * 100);
    const capacity = comp.activeMaxQps || comp.maxQps || 0;
    
    titleEl.innerText = `${comp.name}`;
    
    let desc = "";
    if (comp.tier === 'wan') {
        desc = `Zone WAN. Charge active : ${loadPercent}%. Cache et sécurité périphérique. Réduit la latence de transit ou filtre les paquets suspects.`;
    } else if (comp.tier === 'security') {
        desc = `Zone Sécurité. Fournit le stockage sécurisé des secrets d'API (Vault) ou applique les politiques d'accès (IAM). Prévient les vols de secrets ou failles de privilèges.`;
    } else if (comp.tier === 'lb') {
        desc = `Zone Load Balancing. Charge : ${loadPercent}% (Capacité active : ${capacity} QPS). Distribue le trafic Ingress. S'il sature, les paquets en excès sont détruits.`;
    } else if (comp.tier === 'cicd') {
        desc = `Zone DevOps & CI/CD. Gère le déploiement automatique GitOps. Réduit ou élimine les frais d'autoscaling et accélère la reprise après incident de configuration.`;
    } else if (comp.tier === 'queue') {
        const queueSizeMsg = Math.round(state.queueSize);
        desc = `Zone Message Broker / Buffer. Remplissage : ${loadPercent}% (${queueSizeMsg} requêtes en attente). Absorbe temporairement les pics de trafic pour éviter de saturer les serveurs.`;
    } else if (comp.tier === 'monitoring') {
        desc = `Zone Supervision & Observabilité. Profilage et alertes (APM, Traces). Accélère le warm-up des clusters autoscalés et optimise la latence applicative globale.`;
    } else if (comp.tier === 'compute') {
        desc = `Zone Calcul (Compute). Charge CPU : ${loadPercent}% (Capacité : ${capacity} QPS). Exécute le code métier. Si saturé, la latence augmente exponentiellement.`;
    } else if (comp.tier === 'ai') {
        desc = `Zone Intelligence Artificielle & Analytics. Vertex AI augmente les revenus de vos contrats applicatifs de +25%. BigQuery génère automatiquement du budget additionnel par analyse de données.`;
    } else if (comp.tier === 'db') {
        desc = `Zone Base de Données (Persistance). Charge : ${loadPercent}% (Capacité : ${capacity} QPS). Persiste les données critiques. Gère les verrous transactionnels SQL (Deadlocks).`;
    } else if (comp.tier === 'chaos') {
        desc = `Zone Chaos Engineering. Teste la résilience. Améliore la récupération automatique du SLA de +0.15%/s lors du retour au calme.`;
    }
    
    descEl.innerText = desc;
}

function updateNodePositions() {
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    
    // Définir les limites géométriques des 10 zones blueprint (5 colonnes x 2 lignes)
    const zoneBounds = {
        wan: { x1: 0, x2: w * 0.20, y1: 0, y2: h * 0.5 },
        security: { x1: 0, x2: w * 0.20, y1: h * 0.5, y2: h },
        
        lb: { x1: w * 0.20, x2: w * 0.40, y1: 0, y2: h * 0.5 },
        cicd: { x1: w * 0.20, x2: w * 0.40, y1: h * 0.5, y2: h },
        
        queue: { x1: w * 0.40, x2: w * 0.60, y1: 0, y2: h * 0.5 },
        monitoring: { x1: w * 0.40, x2: w * 0.60, y1: h * 0.5, y2: h },
        
        compute: { x1: w * 0.60, x2: w * 0.80, y1: 0, y2: h * 0.5 },
        ai: { x1: w * 0.60, x2: w * 0.80, y1: h * 0.5, y2: h },
        
        db: { x1: w * 0.80, x2: w * 1.0, y1: 0, y2: h * 0.5 },
        chaos: { x1: w * 0.80, x2: w * 1.0, y1: h * 0.5, y2: h }
    };
    
    // Nœud Internet source virtuel (placé à gauche de la zone WAN)
    nodes = {
        users: { x: w * 0.05, y: h * 0.25, radius: 18, label: 'Clients Internet' }
    };
    
    // Positionner chaque composant dans sa zone
    Object.keys(zoneBounds).forEach(zone => {
        const bounds = zoneBounds[zone];
        const comps = state.infrastructure.components.filter(c => c.tier === zone);
        if (comps.length === 0) return;
        
        // 1. Tri logique par défaut (pour le flux de données cohérent sur la carte réseau)
        if (zone === 'wan') {
            comps.sort((a, b) => {
                const order = { cdn: 1, cdn_varnish: 2, waf: 3, waf_modsec: 4 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'lb') {
            comps.sort((a, b) => {
                const order = { lb_regional: 1, lb_haproxy: 2, lb_global: 3 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'queue') {
            comps.sort((a, b) => {
                const order = { queue_rabbitmq: 1, queue_pubsub: 2, queue_kafka: 3 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'compute') {
            comps.sort((a, b) => {
                const order = { compute_vm: 1, compute_run: 2, compute_functions: 3, compute_gke: 4 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'db') {
            comps.sort((a, b) => {
                const order = { db_redis_vm: 1, db_redis: 2, db_gcs: 3, db_postgres_vm: 4, db_sql_postgres: 5, db_master: 6, db_spanner: 7 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'security') {
            comps.sort((a, b) => {
                const order = { security_iam: 1, security_secretmanager: 2, security_vault: 3 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'monitoring') {
            comps.sort((a, b) => {
                const order = { monitoring_prometheus: 1, monitoring_cloudmonitoring: 2, monitoring_trace: 3 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        } else if (zone === 'ai') {
            comps.sort((a, b) => {
                const order = { ai_bigquery: 1, ai_vertex: 2 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        }
        
        // Séparer les nœuds déplacés manuellement et ceux à positionner automatiquement
        const draggedComps = comps.filter(c => c.dragged);
        const autoComps = comps.filter(c => !c.dragged);
        const countAuto = autoComps.length;
        
        const xMid = (bounds.x1 + bounds.x2) / 2;
        const yMid = (bounds.y1 + bounds.y2) / 2;
        const width = bounds.x2 - bounds.x1;
        const height = bounds.y2 - bounds.y1;
        
        // A. Appliquer la position relative aux nœuds glissés (dragged)
        draggedComps.forEach(comp => {
            comp.x = comp.relativeX * w;
            comp.y = comp.relativeY * h;
            nodes[comp.id] = comp;
        });
        
        // B. Positionner automatiquement le reste
        if (countAuto > 0) {
            if (zone === 'compute') {
                autoComps.forEach((comp, idx) => {
                    comp.x = xMid;
                    if (countAuto === 1) {
                        comp.y = yMid;
                    } else {
                        comp.y = bounds.y1 + height * 0.2 + (idx / (countAuto - 1)) * (height * 0.6);
                    }
                    comp.radius = 16;
                    comp.relativeX = comp.x / w;
                    comp.relativeY = comp.y / h;
                    nodes[comp.id] = comp;
                });
            } else if (zone === 'db') {
                autoComps.forEach((comp, idx) => {
                    // Placement horizontal si plus d'un composant automatique dans DB
                    if (countAuto === 1) {
                        comp.x = xMid;
                        comp.y = yMid;
                    } else {
                        comp.x = bounds.x1 + width * 0.25 + (idx / (countAuto - 1)) * (width * 0.5);
                        comp.y = yMid;
                    }
                    comp.radius = comp.type === 'db_spanner' ? 22 : 18;
                    comp.relativeX = comp.x / w;
                    comp.relativeY = comp.y / h;
                    nodes[comp.id] = comp;
                });
            } else {
                autoComps.forEach((comp, idx) => {
                    comp.radius = 16;
                    if (countAuto === 1) {
                        comp.x = xMid;
                        comp.y = yMid;
                    } else {
                        comp.x = bounds.x1 + width * 0.25 + (idx / (countAuto - 1)) * (width * 0.5);
                        comp.y = yMid;
                    }
                    comp.relativeX = comp.x / w;
                    comp.relativeY = comp.y / h;
                    nodes[comp.id] = comp;
                });
            }
        }
    });
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    updateNodePositions();
}

function renderCanvasFrame() {
    if (state.highlightedZoneTimer > 0) {
        state.highlightedZoneTimer--;
        if (state.highlightedZoneTimer === 0) {
            state.highlightedZone = null;
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background architectural blocks/tiers (V3)
    drawArchitecturalTiers();
    
    // Draw tactical engineering grid (V6)
    drawGrid();
    
    // Draw connector pathways
    drawPathways();
    
    // Draw real-time gauges over the pathway links (V3)
    drawPathwayGauges();
    
    // Update and draw floating packet particles
    if (visualMode === 'packets') {
        updateAndDrawParticles();
    } else {
        drawHeatmapGlows();
    }
    
    // Draw layout nodes
    drawNodes();
    
    // Draw node tooltip on hover
    drawHoverTooltip();
    
    requestAnimationFrame(renderCanvasFrame);
}

function drawArchitecturalTiers() {
    const w = canvas.width;
    const h = canvas.height;
    
    const tiers = {
        wan: { title: "WAN / CACHE EDGE", desc: "CDN Cache & Cloud Armor WAF", neon: "#00f0ff", rgba: "0, 240, 255" },
        security: { title: "SECURITY / SECRETS", desc: "HashiCorp Vault & IAM Rules", neon: "#ff00ff", rgba: "255, 0, 255" },
        lb: { title: "LOAD BALANCING", desc: "Regional LB & Global Anycast", neon: "#ff007f", rgba: "255, 0, 127" },
        cicd: { title: "CI/CD & GITOPS", desc: "ArgoCD Automated Pipeline", neon: "#8a2be2", rgba: "138, 43, 226" },
        queue: { title: "MESSAGE BROKER", desc: "RabbitMQ & Pub/Sub Buffers", neon: "#ff7f00", rgba: "255, 127, 0" },
        monitoring: { title: "MONITORING & APM", desc: "Prometheus APM & OTel Traces", neon: "#ffd700", rgba: "255, 215, 0" },
        compute: { title: "COMPUTE ENGINE", desc: "VMs, Run, GKE, Lambda", neon: "#39ff14", rgba: "57, 255, 20" },
        ai: { title: "AI & ANALYTICS", desc: "Vertex AI & BigQuery Datasets", neon: "#1e90ff", rgba: "30, 144, 255" },
        db: { title: "DATA STORAGE TIER", desc: "Postgres Master/Replica & Spanner", neon: "#daa520", rgba: "218, 165, 32" },
        chaos: { title: "CHAOS ENGINEERING", desc: "Chaos Mesh Daemon & Injectors", neon: "#ff1e1e", rgba: "255, 30, 30" }
    };
    
    // Déterminer quelle zone (tier) est actuellement survolée par la souris
    let hoveredTier = null;
    if (mouseX >= 0 && mouseX <= w && mouseY >= 0 && mouseY <= h) {
        const col = Math.floor(mouseX / (w * 0.20));
        const isUpper = mouseY < h * 0.5;
        if (col === 0) hoveredTier = isUpper ? 'wan' : 'security';
        else if (col === 1) hoveredTier = isUpper ? 'lb' : 'cicd';
        else if (col === 2) hoveredTier = isUpper ? 'queue' : 'monitoring';
        else if (col === 3) hoveredTier = isUpper ? 'compute' : 'ai';
        else if (col === 4) hoveredTier = isUpper ? 'db' : 'chaos';
    }
    
    Object.keys(tiers).forEach(key => {
        const tier = tiers[key];
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        
        // Coordonnées de la grille 5x2
        if (key === 'wan' || key === 'security') {
            x1 = 0; x2 = w * 0.20;
            y1 = key === 'wan' ? 0 : h * 0.5;
            y2 = key === 'wan' ? h * 0.5 : h;
        } else if (key === 'lb' || key === 'cicd') {
            x1 = w * 0.20; x2 = w * 0.40;
            y1 = key === 'lb' ? 0 : h * 0.5;
            y2 = key === 'lb' ? h * 0.5 : h;
        } else if (key === 'queue' || key === 'monitoring') {
            x1 = w * 0.40; x2 = w * 0.60;
            y1 = key === 'queue' ? 0 : h * 0.5;
            y2 = key === 'queue' ? h * 0.5 : h;
        } else if (key === 'compute' || key === 'ai') {
            x1 = w * 0.60; x2 = w * 0.80;
            y1 = key === 'compute' ? 0 : h * 0.5;
            y2 = key === 'compute' ? h * 0.5 : h;
        } else if (key === 'db' || key === 'chaos') {
            x1 = w * 0.80; x2 = w * 1.0;
            y1 = key === 'db' ? 0 : h * 0.5;
            y2 = key === 'db' ? h * 0.5 : h;
        }
        
        // Récupérer le filtre actif du catalogue pour allumer dynamiquement la zone associée
        const activeTabBtn = document.querySelector('.catalog-tab-btn.active');
        const activeCategory = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'all';
        
        let isFilterActive = false;
        if (activeCategory !== 'all' && TIER_TO_CATEGORY[key] === activeCategory) {
            isFilterActive = true;
        }
        
        const hasComps = state.infrastructure.components.some(c => c.tier === key);
        const isDragOver = state.dragOverTier === key;
        const isActive = hasComps || isDragOver || isFilterActive;
        const isHovered = hoveredTier === key;
        const isHighlighted = state.highlightedZone === key && state.highlightedZoneTimer > 0;
        const isBlinking = isHighlighted && (Math.floor(state.highlightedZoneTimer / 4) % 2 === 0);
        
        // Background color avec opacité dynamique et teinte propre à la zone (plus visible)
        if (isActive) {
            ctx.fillStyle = (isDragOver || isFilterActive) 
                ? `rgba(${tier.rgba}, 0.25)` 
                : (isHovered || isBlinking ? `rgba(${tier.rgba}, 0.25)` : `rgba(${tier.rgba}, 0.12)`);
        } else {
            ctx.fillStyle = (isHovered || isBlinking) 
                ? `rgba(${tier.rgba}, 0.18)` 
                : `rgba(${tier.rgba}, 0.05)`;
        }
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        
        // Bordures avec glow néon renforcé
        ctx.lineWidth = (isHovered || isBlinking || isFilterActive) ? 3.0 : 1.5;
        if (isActive || isBlinking) {
            ctx.strokeStyle = (isHovered || isBlinking || isFilterActive) ? `rgba(${tier.rgba}, 1.0)` : `rgba(${tier.rgba}, 0.85)`;
            ctx.shadowBlur = (isHovered || isBlinking || isFilterActive) ? 25 : 8;
            ctx.shadowColor = tier.neon;
        } else {
            ctx.strokeStyle = isHovered ? `rgba(${tier.rgba}, 0.75)` : `rgba(${tier.rgba}, 0.35)`;
            ctx.shadowBlur = isHovered ? 15 : 0;
            ctx.shadowColor = tier.neon;
            if (!isHovered) {
                ctx.setLineDash([4, 4]);
            }
        }
        ctx.strokeRect(x1 + 3, y1 + 3, x2 - x1 - 6, y2 - y1 - 6);
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        
        // Textes et indications de statut dans la zone
        if (!hasComps) {
            ctx.fillStyle = (isHovered || isFilterActive) ? `rgba(${tier.rgba}, 0.90)` : `rgba(${tier.rgba}, 0.55)`;
            ctx.font = '700 11px "Inter"';
            ctx.textAlign = 'center';
            ctx.fillText("EN ATTENTE DE PROVISIONNEMENT", (x1 + x2)/2, (y1 + y2)/2 + 4);
            
            // Titre en haut discret
            ctx.fillStyle = (isHovered || isFilterActive) ? `rgba(${tier.rgba}, 0.90)` : `rgba(${tier.rgba}, 0.50)`;
            ctx.font = '800 13px "Orbitron"';
            ctx.textAlign = 'left';
            ctx.fillText(tier.title, x1 + 10, y1 + 22);
        } else {
            // Actif - Titre en néon plein
            ctx.fillStyle = (isHovered || isFilterActive) ? `rgba(${tier.rgba}, 1.0)` : `rgba(${tier.rgba}, 0.85)`;
            ctx.font = '900 13px "Orbitron"';
            ctx.textAlign = 'left';
            ctx.fillText(tier.title, x1 + 10, y1 + 22);
        }
    });
} function getDynamicPathways() {
    const paths = [];
    const wan = state.infrastructure.components.filter(c => c.tier === 'wan');
    const lb = state.infrastructure.components.filter(c => c.tier === 'lb');
    const queue = state.infrastructure.components.filter(c => c.tier === 'queue');
    const compute = state.infrastructure.components.filter(c => c.tier === 'compute');
    const db = state.infrastructure.components.filter(c => c.tier === 'db' || c.type === 'db_master');
    
    const clientNode = nodes.users;
    if (!clientNode) return paths;
    
    // Etape 1: client -> wan (s'il y en a) ou client -> lb
    if (wan.length > 0) {
        wan.forEach(w => {
            paths.push({ from: clientNode, to: w, type: 'wan', label: 'Ingress' });
        });
        wan.forEach(w => {
            lb.forEach(l => {
                paths.push({ from: w, to: l, type: 'lb', label: 'Filtered' });
            });
        });
    } else {
        lb.forEach(l => {
            paths.push({ from: clientNode, to: l, type: 'lb', label: 'Ingress' });
        });
    }
    
    // Etape 2: lb -> queue (si présente) ou lb -> compute
    if (queue.length > 0) {
        lb.forEach(l => {
            queue.forEach(q => {
                paths.push({ from: l, to: q, type: 'queue', label: 'Buffered' });
            });
        });
        queue.forEach(q => {
            compute.forEach(c => {
                paths.push({ from: q, to: c, type: 'compute', label: 'Process' });
            });
        });
    } else {
        lb.forEach(l => {
            compute.forEach(c => {
                paths.push({ from: l, to: c, type: 'compute', label: 'Process' });
            });
        });
    }
    
    // Etape 3: compute -> db
    compute.forEach(c => {
        db.forEach(d => {
            paths.push({ from: c, to: d, type: 'db', label: 'SQL/NoSQL' });
        });
    });
    
    return paths;
}

function isNodeImpactedByIncident(nodeId, nodeType, nodeTier) {
    if (state.activeEvents.length === 0) return false;
    
    return state.activeEvents.some(e => {
        if (e.type === 'DDOS') {
            return nodeTier === 'wan' || nodeTier === 'lb' || nodeId === 'users';
        }
        if (e.type === 'FIBER_CUT') {
            return nodeTier === 'wan' || nodeId === 'users';
        }
        if (e.type === 'DB_LOCK') {
            return (nodeTier === 'db' || nodeType === 'db_master') && nodeType !== 'db_redis' && nodeType !== 'db_redis_vm';
        }
        if (e.type === 'CREDENTIALS_LEAK') {
            return nodeTier === 'security';
        }
        if (e.type === 'CONFIG_EXPLOIT') {
            return nodeTier === 'security' || nodeTier === 'cicd';
        }
        if (e.type === 'DNS_ATTACK') {
            return nodeTier === 'wan' || nodeTier === 'lb' || nodeId === 'users';
        }
        if (e.type === 'BRUTE_FORCE') {
            return nodeTier === 'compute' && (nodeType === 'compute_vm' || nodeId.includes('initial_1'));
        }
        if (e.type === 'DISK_FULL') {
            return (nodeTier === 'db' || nodeType === 'db_master') && (nodeType === 'db_postgres_vm' || nodeType === 'db_master');
        }
        if (e.type === 'ZONE_OUTAGE') {
            return (nodeTier === 'compute' && (nodeType === 'compute_vm' || nodeId.includes('initial_1'))) ||
                   ((nodeTier === 'db' || nodeType === 'db_master') && (nodeType === 'db_postgres_vm' || nodeType === 'db_master'));
        }
        return false;
    });
}

function isPathImpactedByIncident(pathType) {
    if (state.activeEvents.length === 0) return false;
    return state.activeEvents.some(e => {
        if (e.type === 'DDOS') return pathType === 'wan' || pathType === 'lb';
        if (e.type === 'FIBER_CUT') return pathType === 'wan';
        if (e.type === 'DB_LOCK') return pathType === 'db';
        if (e.type === 'DNS_ATTACK') return pathType === 'wan' || pathType === 'lb';
        if (e.type === 'BRUTE_FORCE') return pathType === 'compute';
        if (e.type === 'DISK_FULL') return pathType === 'db';
        if (e.type === 'ZONE_OUTAGE') return pathType === 'compute' || pathType === 'db';
        return false;
    });
}

function getPathLoadRatio(type) {
    let ratio = 0;
    if (type === 'wan' || type === 'lb') {
        const cap = state.lastNetworkDetails.lbCapacity || 150;
        ratio = state.qps / cap;
    } else if (type === 'queue') {
        const queueComps = state.infrastructure.components.filter(c => c.tier === 'queue');
        const maxQueueLimit = queueComps.reduce((acc, q) => {
            const metrics = COMPONENT_METRICS[q.type];
            return acc + (metrics ? metrics.maxQueueSize : 0);
        }, 0);
        ratio = state.queueSize / (maxQueueLimit || 1);
    } else if (type === 'compute') {
        const computes = state.infrastructure.components.filter(c => c.tier === 'compute');
        ratio = computes.reduce((acc, c) => acc + c.load, 0) / (computes.length || 1);
    } else if (type === 'db') {
        const dbs = state.infrastructure.components.filter(c => c.tier === 'db' || c.type === 'db_master');
        ratio = dbs.reduce((acc, d) => acc + d.load, 0) / (dbs.length || 1);
    }
    return Math.min(1.0, Math.max(0.0, ratio));
}

function getColorForLoad(ratio) {
    if (ratio > 0.85) return '#ff3b30'; // Rouge vif (surcharge)
    if (ratio > 0.55) return '#ffb700'; // Jaune/Orange (charge moyenne)
    return '#39ff14'; // Vert fluo (charge nominale)
}

function drawPathways() {
    const paths = getDynamicPathways();
    
    // 1. Dessiner d'abord les lignes de liaison réseau ordinaires
    paths.forEach(p => {
        if (!p.from || !p.to) return;
        
        // Vérifier si ce chemin est actuellement survolé
        const isHovered = state.hoveredPath && 
                          state.hoveredPath.from.x === p.from.x && 
                          state.hoveredPath.from.y === p.from.y && 
                          state.hoveredPath.to.x === p.to.x && 
                          state.hoveredPath.to.y === p.to.y;
                           
        if (isHovered) return; // Dessiné dans la seconde phase pour passer au-dessus
        
        ctx.beginPath();
        ctx.moveTo(p.from.x, p.from.y);
        ctx.lineTo(p.to.x, p.to.y);
        
        if (isPathImpactedByIncident(p.type)) {
            // Clignotement rouge néon épais sous incident actif
            const pulse = 0.5 + Math.sin(Date.now() / 150) * 0.4;
            ctx.strokeStyle = `rgba(255, 59, 48, ${pulse})`;
            ctx.lineWidth = 3 + Math.sin(Date.now() / 150) * 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3b30';
        } else {
            // Couleur dépendante de la charge
            const ratio = getPathLoadRatio(p.type);
            const loadColor = getColorForLoad(ratio);
            ctx.strokeStyle = loadColor;
            ctx.globalAlpha = 0.35 + ratio * 0.35; // 0.35 à 0.70 d'opacité selon la charge
            ctx.lineWidth = 1.5 + ratio * 1.5; // 1.5px à 3px selon la charge
            ctx.shadowBlur = ratio > 0.55 ? 6 : 0;
            ctx.shadowColor = loadColor;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0; // Réinitialiser le shadow blur
        ctx.globalAlpha = 1.0;
    });

    // 2. Dessiner en surbrillance le lien actuellement survolé par l'utilisateur
    if (state.hoveredPath && state.hoveredPath.from && state.hoveredPath.to) {
        ctx.beginPath();
        ctx.moveTo(state.hoveredPath.from.x, state.hoveredPath.from.y);
        ctx.lineTo(state.hoveredPath.to.x, state.hoveredPath.to.y);
        
        if (isPathImpactedByIncident(state.hoveredPath.type)) {
            const pulse = 0.6 + Math.sin(Date.now() / 150) * 0.4;
            ctx.strokeStyle = `rgba(255, 59, 48, ${pulse})`;
            ctx.lineWidth = 5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff3b30';
        } else {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3.5;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00f0ff';
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Réinitialiser le shadow blur pour les autres dessins
    }
}

function drawPathwayGauges() {
    if (!state.uiSettings.showPerformance) return;
    if (state.qps === 0) return;
    
    const paths = getDynamicPathways();
    const renderedTypes = new Set();
    
    paths.forEach(p => {
        if (!p.from || !p.to) return;
        if (renderedTypes.has(p.type)) return;
        renderedTypes.add(p.type);
        
        const mx = (p.from.x + p.to.x) / 2;
        const my = (p.from.y + p.to.y) / 2;
        
        let ratio = 0;
        let label = '';
        let color = 'var(--cyan)';
        
        if (p.type === 'wan' || p.type === 'lb') {
            const cap = state.lastNetworkDetails.lbCapacity || 150;
            ratio = Math.min(1.0, state.qps / cap);
            label = `${Math.round(state.qps)} QPS`;
            color = 'var(--cyan)';
        } else if (p.type === 'queue') {
            const queueComps = state.infrastructure.components.filter(c => c.tier === 'queue');
            const maxQueueLimit = queueComps.reduce((acc, q) => {
                const metrics = COMPONENT_METRICS[q.type];
                return acc + (metrics ? metrics.maxQueueSize : 0);
            }, 0);
            ratio = Math.min(1.0, state.queueSize / (maxQueueLimit || 1));
            label = `Queue: ${Math.round(state.queueSize)}`;
            color = 'var(--yellow)';
        } else if (p.type === 'compute') {
            const computes = state.infrastructure.components.filter(c => c.tier === 'compute');
            ratio = computes.reduce((acc, c) => acc + c.load, 0) / (computes.length || 1);
            label = `CPU: ${Math.round(ratio * 100)}%`;
            color = '#39ff14';
        } else if (p.type === 'db') {
            const dbs = state.infrastructure.components.filter(c => c.tier === 'db' || c.type === 'db_master');
            ratio = dbs.reduce((acc, d) => acc + d.load, 0) / (dbs.length || 1);
            label = `Locks: ${Math.round(ratio * 100)}%`;
            color = '#ffb700';
        }
        
        let customColor = color;
        if (ratio > 0.85) customColor = 'var(--red)';
        else if (ratio > 0.65) customColor = 'var(--yellow)';
        
        ctx.fillStyle = 'rgba(5, 8, 17, 0.9)';
        ctx.strokeStyle = customColor;
        ctx.lineWidth = 1;
        
        const boxW = 90;
        const boxH = 22;
        
        ctx.fillRect(mx - boxW/2, my - boxH/2 - 4, boxW, boxH);
        ctx.strokeRect(mx - boxW/2, my - boxH/2 - 4, boxW, boxH);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 13px "Orbitron"';
        ctx.textAlign = 'center';
        ctx.fillText(label, mx, my - boxH/2 + 11);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(mx - boxW/2, my + boxH/2 + 2, boxW, 3);
        
        ctx.fillStyle = customColor;
        ctx.fillRect(mx - boxW/2, my + boxH/2 + 2, boxW * ratio, 3);
    });
}

function drawHoverTooltip() {
    if (!state.uiSettings.showTooltips) return;
    if (!hoveredNode) return;
    
    let tooltipTitle = '';
    let metricText = '';
    let color = 'var(--cyan)';
    
    if (hoveredNode === 'users') {
        tooltipTitle = 'Utilisateurs';
        metricText = `${Math.round(state.qps)} QPS Actifs`;
    } else {
        const comp = state.infrastructure.components.find(c => c.id === hoveredNode);
        if (!comp) return;
        
        tooltipTitle = comp.name;
        const loadPercent = Math.round((comp.load || 0) * 100);
        
        if (comp.tier === 'compute') {
            metricText = `CPU Load: ${loadPercent}% (${Math.round(comp.activeQps || 0)} QPS)`;
            color = comp.load > 0.85 ? 'var(--red)' : 'var(--green)';
        } else if (comp.tier === 'queue') {
            metricText = `Buffer: ${loadPercent}% (${Math.round(state.queueSize)} msgs)`;
            color = comp.load > 0.85 ? 'var(--red)' : 'var(--yellow)';
        } else if (comp.tier === 'db') {
            metricText = `DB Load: ${loadPercent}%`;
            color = comp.load > 0.85 ? 'var(--red)' : 'var(--yellow)';
        } else {
            metricText = `Charge: ${loadPercent}%`;
            color = comp.load > 0.85 ? 'var(--red)' : 'var(--cyan)';
        }
    }
    
    const tx = mouseX + 15;
    const ty = mouseY + 15;
    
    ctx.fillStyle = 'rgba(5, 8, 17, 0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    const w = 180;
    const h = 44;
    
    let finalX = tx;
    if (tx + w > canvas.width) finalX = mouseX - w - 15;
    let finalY = ty;
    if (ty + h > canvas.height) finalY = mouseY - h - 15;
    
    ctx.fillRect(finalX, finalY, w, h);
    ctx.strokeRect(finalX, finalY, w, h);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Inter"';
    ctx.textAlign = 'left';
    ctx.fillText(tooltipTitle, finalX + 10, finalY + 16);
    
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '500 11px "Orbitron"';
    ctx.fillText(metricText, finalX + 10, finalY + 32);
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
    ctx.lineWidth = 0.5;
    
    const gridSize = 30;
    ctx.setLineDash([1, 4]); // Petits pointillés tactiques
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]); // Reset
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function drawNodes() {
    Object.keys(nodes).forEach(key => {
        const node = nodes[key];
        const comp = state.infrastructure.components.find(c => c.id === key);
        
        let zoneGlowColor = 'rgba(0, 240, 255, 0.5)';
        if (key === 'db_master') {
            zoneGlowColor = 'rgba(218, 165, 32, 0.5)';
        }
        
        if (comp) {
            if (comp.tier === 'compute') zoneGlowColor = 'rgba(57, 255, 20, 0.5)';
            else if (comp.tier === 'db') zoneGlowColor = 'rgba(218, 165, 32, 0.5)';
            else if (comp.tier === 'queue') zoneGlowColor = 'rgba(255, 127, 0, 0.5)';
            else if (comp.tier === 'wan') zoneGlowColor = 'rgba(0, 240, 255, 0.5)';
            else if (comp.tier === 'security') zoneGlowColor = 'rgba(255, 0, 255, 0.5)';
            else if (comp.tier === 'cicd') zoneGlowColor = 'rgba(138, 43, 226, 0.5)';
            else if (comp.tier === 'monitoring') zoneGlowColor = 'rgba(255, 215, 0, 0.5)';
            else if (comp.tier === 'ai') zoneGlowColor = 'rgba(30, 144, 255, 0.5)';
            else if (comp.tier === 'chaos') zoneGlowColor = 'rgba(255, 30, 30, 0.5)';
        }
        
        // Télémétrie de charge (Vert/Jaune/Rouge)
        let loadRatio = 0;
        if (state.uiSettings.showLoad) {
            if (comp) loadRatio = comp.load || 0;
            else if (key === 'users') loadRatio = Math.min(1.0, state.qps / (state.lastNetworkDetails.lbCapacity || 150));
        }
        
        let strokeColor = getColorForLoad(loadRatio);
        const isImpacted = isNodeImpactedByIncident(key, comp ? comp.type : null, comp ? comp.tier : null);
        
        if (isImpacted) {
            const pulse = 0.5 + Math.sin(Date.now() / 120) * 0.5;
            strokeColor = `rgba(255, 59, 48, ${0.4 + pulse * 0.6})`;
        }
        
        const isHovered = hoveredNode === key;
        const scale = isHovered ? 1.15 : 1.0;
        
        // Halo néon discret derrière le logo si impacté ou sélectionné
        if (isImpacted || isHovered) {
            ctx.shadowBlur = isHovered ? 20 : 12;
            ctx.shadowColor = isImpacted ? '#ff3b30' : strokeColor;
            ctx.fillStyle = isImpacted ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 240, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 18 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Dessin du logo en grand, centré (sans cercle noir)
        let imageKey = null;
        if (key === 'users') imageKey = 'users';
        else if (comp) imageKey = comp.type;
        
        if (imageKey && nodeImages[imageKey]) {
            const imgSize = (isHovered ? 44 : 38);
            ctx.drawImage(nodeImages[imageKey], node.x - imgSize / 2, node.y - imgSize / 2, imgSize, imgSize);
        } else {
            const pulse = Math.abs(Math.sin(Date.now() * 0.002)) * 0.3 + 0.7;
            ctx.fillStyle = zoneGlowColor;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 16 * scale * 0.4 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // F. Nom/Légende en dessous du nœud à Y + 30
        ctx.fillStyle = isImpacted ? '#ff3b30' : (isHovered ? '#00f0ff' : '#94a3b8');
        ctx.font = isHovered ? 'bold 11px "Orbitron"' : '600 10px "Orbitron"';
        ctx.textAlign = 'center';
        const label = node.label || (comp ? comp.name : null) || "Composant";
        ctx.fillText(label.toUpperCase(), node.x, node.y + 30);
        
        // G. Dessin de la mini-fiche statistique Orbitron glassmorphic à droite (X + 25, Y - 11, 75x22px)
        const boxX = node.x + 25;
        const boxY = node.y - 11;
        const boxW = 75;
        const boxH = 22;
        
        ctx.fillStyle = 'rgba(10, 15, 29, 0.65)';
        ctx.strokeStyle = isImpacted ? 'rgba(255, 59, 48, 0.8)' : (strokeColor || '#39ff14');
        ctx.lineWidth = 1;
        
        // Clignotement de la bordure si incident
        if (isImpacted && Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.2)';
        }
        
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 4, true, true);
        
        // Texte statistique dans la boîte
        let statText = 'ACTIVE';
        if (key === 'users') {
            statText = `${Math.round(state.qps)} QPS`;
        } else if (comp) {
            if (comp.tier === 'compute') {
                statText = `${Math.round((comp.load || 0) * 100)}% CPU`;
            } else if (comp.tier === 'db') {
                statText = `${Math.round((comp.load || 0) * 100)}% DB`;
            } else if (comp.tier === 'queue') {
                statText = `${state.queueSize || 0} MSG`;
            } else if (comp.tier === 'lb' || comp.tier === 'wan') {
                const maxQ = comp.activeMaxQps || comp.maxQps || 150;
                statText = `${Math.round((comp.load || 0) * maxQ)} QPS`;
            } else if (comp.tier === 'security') {
                statText = 'SECURE';
            } else if (comp.tier === 'cicd') {
                statText = 'GITOPS';
            } else if (comp.tier === 'monitoring') {
                statText = 'APM';
            } else if (comp.tier === 'ai') {
                statText = `${Math.round((comp.load || 0) * 100)}% AI`;
            } else if (comp.tier === 'chaos') {
                statText = 'CHAOS';
            }
        } else if (key === 'db_master') {
            const masterLoad = state.infrastructure.components.find(c => c.type === 'db_master')?.load || 0;
            statText = `${Math.round(masterLoad * 100)}% DB`;
        }
        
        ctx.fillStyle = isImpacted ? '#ff3b30' : '#f8fafc';
        ctx.font = 'bold 9px "Orbitron"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(statText, boxX + boxW / 2, boxY + boxH / 2 + 1);
        ctx.textBaseline = 'alphabetic'; // Rétablir la valeur par défaut
    });
    
    // Bouton de suppression rapide
    if (selectedComponentId && selectedComponentId !== 'lb') {
        const comp = state.infrastructure.components.find(c => c.id === selectedComponentId);
        if (comp) {
            const btnX = comp.x + 20;
            const btnY = comp.y - 20;
            const btnRadius = 8;
            
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(255, 59, 48, 0.6)';
            ctx.fillStyle = '#ff3b30';
            ctx.beginPath();
            ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(btnX - 3, btnY - 3);
            ctx.lineTo(btnX + 3, btnY + 3);
            ctx.moveTo(btnX + 3, btnY - 3);
            ctx.lineTo(btnX - 3, btnY + 3);
            ctx.stroke();
        }
    }
}

function createDynamicParticlePath() {
    const path = [nodes.users];
    
    const wan = state.infrastructure.components.filter(c => c.tier === 'wan');
    const lb = state.infrastructure.components.filter(c => c.tier === 'lb');
    const queue = state.infrastructure.components.filter(c => c.tier === 'queue');
    const compute = state.infrastructure.components.filter(c => c.tier === 'compute');
    const db = state.infrastructure.components.filter(c => c.tier === 'db' || c.type === 'db_master');
    
    if (wan.length > 0) {
        path.push(wan[Math.floor(Math.random() * wan.length)]);
    }
    if (lb.length > 0) {
        path.push(lb[Math.floor(Math.random() * lb.length)]);
    }
    if (queue.length > 0) {
        path.push(queue[Math.floor(Math.random() * queue.length)]);
    }
    if (compute.length > 0) {
        path.push(compute[Math.floor(Math.random() * compute.length)]);
    }
    if (db.length > 0) {
        path.push(db[Math.floor(Math.random() * db.length)]);
    }
    
    return path;
}

function updateAndDrawParticles() {
    if (state.qps === 0 || state.gameSpeed === 0) {
        particles.forEach(p => {
            if (!p.path || p.nodeIndex >= p.path.length - 1) return;
            const from = p.path[p.nodeIndex];
            const to = p.path[p.nodeIndex + 1];
            if (!from || !to) return;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        return;
    }
    
    const particlesToSpawn = Math.min(5, Math.ceil((state.qps / 20) * state.gameSpeed));
    
    let color = '#39ff14'; // Vert
    if (state.latency > 150) color = '#ffb700'; // Jaune
    if (state.status === 'INCIDENT' && Math.random() < 0.15) color = '#ff3b30'; // Rouge
    
    for (let i = 0; i < particlesToSpawn; i++) {
        if (Math.random() < 0.25) {
            const path = createDynamicParticlePath();
            if (path.length > 1) {
                particles.push({
                    path: path,
                    nodeIndex: 0,
                    color: color,
                    speed: (1.5 + Math.random() * 1.5) * state.gameSpeed,
                    progress: 0
                });
            }
        }
    }
    
    particles = particles.filter(p => {
        if (!p.path || p.nodeIndex >= p.path.length - 1) return false;
        
        p.progress += p.speed * 0.01;
        
        const from = p.path[p.nodeIndex];
        const to = p.path[p.nodeIndex + 1];
        
        if (!from || !to) return false;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        
        const x = from.x + (to.x - from.x) * p.progress;
        const y = from.y + (to.y - from.y) * p.progress;
        
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = p.color + '33';
        ctx.beginPath();
        ctx.arc(x - (to.x - from.x)*0.05, y - (to.y - from.y)*0.05, 5, 0, Math.PI * 2);
        ctx.fill();
        
        if (p.progress >= 1.0) {
            p.nodeIndex++;
            p.progress = 0;
            if (p.nodeIndex >= p.path.length - 1) {
                return false; // Arrivé au bout
            }
        }
        return true;
    });
}

function drawHeatmapGlows() {
    state.infrastructure.components.forEach(comp => {
        drawHeatmapNode(comp, comp.load || 0);
    });
}

function drawHeatmapNode(node, load) {
    if (!state.uiSettings.showLoad) return;
    if (!node) return;
    
    let redVal = Math.floor(load * 255);
    let greenVal = Math.floor((1 - load) * 255);
    
    const grad = ctx.createRadialGradient(node.x, node.y, 5, node.x, node.y, (node.radius || 16) * 2.5);
    grad.addColorStop(0, `rgba(${redVal}, ${greenVal}, 20, 0.45)`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, (node.radius || 16) * 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgb(${redVal}, ${greenVal}, 100)`;
    ctx.font = 'bold 11px "Orbitron"';
    ctx.fillText(`${Math.round(load * 100)}% LOAD`, node.x, node.y + 4);
}

// --- MODE SELECTION AND TUTORIAL SYSTEM ---

window.selectStartMode = function(mode) {
    if (mode === 'tutorial') {
        state.isTutorial = true;
        state.tutorialStep = 0;
        document.getElementById('tutorial-banner').style.display = 'flex';
        startGame();
        updateTutorialUI();
        logMessage("Mode Académie DevOps", "Démarrage du parcours guidé interactif. Suivez les instructions dans la bannière supérieure.", "info");
    } else {
        state.isTutorial = false;
        document.getElementById('tutorial-banner').style.display = 'none';
        startGame();
        logMessage("Mode Simulation Libre", "Simulation lancée. Signez des contrats et gérez votre infrastructure de manière autonome !", "info");
    }
};

window.updateTutorialUI = function() {
    const banner = document.getElementById('tutorial-banner');
    const textEl = document.getElementById('tutorial-text');
    const btnEl = document.getElementById('tutorial-btn');
    if (!banner || !textEl || !btnEl) return;
    
    banner.style.display = 'flex';
    
    switch (state.tutorialStep) {
        case 0:
            textEl.innerHTML = `🎓 <strong>Bienvenue dans l'Académie DevOps !</strong> Apprenez à concevoir une architecture cloud résiliente. Cliquez sur le bouton à droite pour commencer.`;
            btnEl.innerText = "Compris";
            btnEl.style.display = "inline-block";
            btnEl.disabled = false;
            break;
        case 1:
            textEl.innerHTML = `📋 <strong>Étape 1/5 : Signature du contrat.</strong> Ouvrez l'onglet "Missions & Contrats" (panneau de gauche), repérez "Startup Innovante", puis cliquez sur <strong>Démarrer le contrat</strong>.`;
            btnEl.innerText = "En attente...";
            btnEl.style.display = "none";
            break;
        case 2:
            textEl.innerHTML = `⚖️ <strong>Étape 2/5 : Répartition de charge.</strong> Dans la zone de catalogue à droite (filtre Réseau), glissez un <strong>Load Balancer Régional ou Global</strong> vers la zone Réseau à gauche du canvas.`;
            btnEl.style.display = "none";
            break;
        case 3:
            textEl.innerHTML = `🖥️ <strong>Étape 3/5 : Puissance de calcul.</strong> Glissez un serveur applicatif <strong>VM Compute Engine ou GKE</strong> (filtre Compute à droite) dans la zone Compute centrale du canvas.`;
            btnEl.style.display = "none";
            break;
        case 4:
            // Mettre à jour en direct la charge et le nombre de VMs
            const activeContract = state.contracts.find(c => c.id === state.activeContractId);
            let vmCount = 0;
            let cpuPct = 100;
            if (activeContract && activeContract.id === 'startup') {
                const computes = activeContract.infrastructure.components.filter(c => c.tier === 'compute');
                vmCount = computes.length;
                let totalLoad = 0;
                computes.forEach(c => totalLoad += (c.load || 0));
                cpuPct = computes.length > 0 ? Math.round((totalLoad / computes.length) * 100) : 100;
            }
            textEl.innerHTML = `🚨 <strong>Étape 4/5 : Pic de charge (80 QPS) !</strong> CPU moyen : <span style="color: ${cpuPct >= 80 ? 'var(--red)' : 'var(--green)'}; font-weight: bold;">${cpuPct}%</span> (cible: &lt;80%). VMs : <span style="font-weight: bold;">${vmCount}/2 minimum</span>. Déployez plus de serveurs et lancez la simulation (Barre Espace ou [▶ x1]) !`;
            btnEl.style.display = "none";
            break;
        case 5:
            textEl.innerHTML = `🏆 <strong>Étape 5/5 : Félicitations !</strong> Vous avez stabilisé l'infrastructure sous haute charge en la distribuant horizontalement. Vous maîtrisez le scaling.`;
            btnEl.innerText = "Terminer et Passer en Jeu Libre";
            btnEl.style.display = "inline-block";
            btnEl.disabled = false;
            break;
    }
};

window.checkTutorialTriggers = function(action, data) {
    if (!state.isTutorial) return;
    
    if (state.tutorialStep === 1) {
        if (action === 'sign_contract' && data === 'startup') {
            state.tutorialStep = 2;
            updateTutorialUI();
            logMessage("Objectif Atteint", "Contrat Startup Innovante signé ! Nouveau projet initialisé.", "green");
        }
    } else if (state.tutorialStep === 2) {
        if (action === 'deploy_component') {
            const comp = data;
            if (comp && comp.tier === 'lb') {
                state.tutorialStep = 3;
                updateTutorialUI();
                logMessage("Objectif Atteint", "Load Balancer déployé ! Prêt pour distribuer le trafic.", "green");
            }
        }
    } else if (state.tutorialStep === 3) {
        if (action === 'deploy_component') {
            const comp = data;
            if (comp && comp.tier === 'compute') {
                state.tutorialStep = 4;
                updateTutorialUI();
                logMessage("Objectif Atteint", "Serveur Compute déployé ! Attention, un pic de charge de 80 QPS arrive.", "warning");
            }
        }
    } else if (state.tutorialStep === 4) {
        if (action === 'sim_tick') {
            const activeContract = state.contracts.find(c => c.id === state.activeContractId);
            if (activeContract && activeContract.id === 'startup') {
                const components = activeContract.infrastructure.components;
                const computes = components.filter(c => c.tier === 'compute');
                
                let totalLoad = 0;
                computes.forEach(c => totalLoad += (c.load || 0));
                const avgLoad = computes.length > 0 ? totalLoad / computes.length : 1.0;
                
                if (computes.length >= 2 && avgLoad < 0.80 && state.gameSpeed > 0) {
                    state.tutorialStep = 5;
                    updateTutorialUI();
                    logMessage("Objectif Atteint", "Charge stabilisée sous 80% avec 2+ VMs ! Résilience assurée.", "green");
                } else {
                    updateTutorialUI();
                }
            }
        }
    }
};

window.updateObjectivesPanel = function() {
    const container = document.getElementById('objectives-panel');
    if (!container) return;
    
    // Calcul du SLA Global actuel
    const signedContractsList = state.contracts.filter(c => c.signed);
    const currentCompanySla = signedContractsList.length > 0 
        ? (signedContractsList.reduce((sum, c) => sum + c.sla, 0) / signedContractsList.length) 
        : 100.0;
        
    const saasContract = state.contracts.find(c => c.id === 'saas_ai');
    
    let html = `
        <div class="objectives-header">🏁 JALONS & OBJECTIFS</div>
    `;
    
    // 1. OBJECTIF ULTIME
    html += `<div style="margin-bottom: 0.8rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.5rem;">`;
    if (saasContract && saasContract.signed) {
        // En cours de stabilisation
        const secondsHeld = Math.min(30, Math.floor((saasContract.victoryHoldTimer || 0) * 1.33));
        const pct = Math.round((secondsHeld / 30) * 100);
        const barCells = Math.floor(secondsHeld / 3);
        const barStr = '█'.repeat(barCells) + '░'.repeat(10 - barCells);
        
        html += `
            <div style="font-weight: bold; color: var(--green); font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span>🚀 STABILISATION SAAS AI</span>
                <span class="pulse">${secondsHeld}s / 30s</span>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--cyan); margin-top: 0.2rem; letter-spacing: 2px;">
                ${barStr} <span style="color: #fff; font-weight: bold;">${pct}%</span>
            </div>
            <div style="font-size: 0.65rem; color: var(--color-muted); margin-top: 0.2rem; line-height: 1.2;">
                Maintenez le SLA au-dessus de 99.95% pour remporter la victoire.
            </div>
        `;
    } else {
        // Verrouillé / Prérequis
        const saasReq = state.contracts.find(c => c.id === 'saas_ai');
        const minTrust = saasReq ? (saasReq.minTrustToSign || 90) : 90;
        const minSla = saasReq ? (saasReq.minSlaToSign || 98) : 98;
        
        const isTrustOk = state.trust >= minTrust;
        const isSlaOk = currentCompanySla >= minSla;
        
        // Check list technique du contrat saas_ai
        let techListHtml = '';
        if (saasReq && saasReq.reqDetails) {
            saasReq.reqDetails.forEach(detail => {
                const passed = detail.check(state.infrastructure, saasReq);
                const mark = passed ? '<span style="color: var(--green); font-weight: bold;">[✔]</span>' : '<span style="color: var(--red);">[✘]</span>';
                techListHtml += `<div style="font-size: 0.65rem; padding-left: 0.5rem; color: ${passed ? 'var(--color-text)' : 'var(--color-muted)'};">${mark} ${detail.text}</div>`;
            });
        }
        
        html += `
            <div style="font-weight: bold; color: var(--magenta); font-size: 0.75rem;">
                🏆 OBJECTIF ULTIME : SaaS Enterprise (Bloqué)
            </div>
            <div style="font-size: 0.68rem; margin: 0.25rem 0;">
                <div style="color: ${isTrustOk ? 'var(--green)' : 'var(--red)'};">
                    ${isTrustOk ? '✔' : '✘'} Confiance Globale : ${Math.round(state.trust)}% / ${minTrust}%
                </div>
                <div style="color: ${isSlaOk ? 'var(--green)' : 'var(--red)'};">
                    ${isSlaOk ? '✔' : '✘'} SLA Moyen : ${currentCompanySla.toFixed(2)}% / ${minSla.toFixed(2)}%
                </div>
            </div>
            <div style="font-size: 0.7rem; font-weight: bold; color: var(--cyan); margin-top: 0.3rem;">Prérequis techniques de l'infrastructure :</div>
            ${techListHtml}
        `;
    }
    html += `</div>`;
    
    // 2. CONTRATS ACTIFS
    html += `<div style="margin-bottom: 0.8rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.5rem;">`;
    html += `<div style="font-weight: bold; color: var(--cyan); font-size: 0.72rem; margin-bottom: 0.3rem;">📡 CLIENTS ACTIFS</div>`;
    
    const activeContracts = state.contracts.filter(c => c.signed);
    if (activeContracts.length === 0) {
        html += `<div style="font-size: 0.68rem; color: var(--color-muted); font-style: italic;">Aucun client actif. Signez un contrat disponible pour débuter la production de revenus.</div>`;
    } else {
        activeContracts.forEach(c => {
            const hasIncident = c.activeEvents && c.activeEvents.length > 0;
            const incidentColor = hasIncident ? 'var(--red)' : 'var(--green)';
            const slaColor = c.sla < c.requiredSla ? 'var(--red)' : 'var(--green)';
            
            html += `
                <div class="objective-row" style="margin-bottom: 0.35rem; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: bold; color: #fff;">• ${c.name}</span>
                        <span style="font-size: 0.65rem; color: ${slaColor}; font-weight: bold;">SLA: ${c.sla.toFixed(2)}% (req: ${c.requiredSla.toFixed(1)}%)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--color-muted); padding-left: 0.5rem;">
                        <span>Confiance : <strong style="color: var(--cyan);">${Math.round(c.trust)}%</strong></span>
                        <span>Revenu : <strong style="color: var(--green); font-family: var(--font-mono);">+${c.revenue} $/s</strong></span>
                    </div>
            `;
            if (hasIncident) {
                c.activeEvents.forEach(e => {
                    html += `
                        <div style="font-size: 0.65rem; color: var(--red); padding-left: 0.5rem; margin-top: 0.1rem;" class="pulse">
                            🚨 INCIDENT : ${e.name} (${e.durationRemaining}s restants)
                        </div>
                    `;
                });
            }
            html += `</div>`;
        });
    }
    html += `</div>`;
    
    // 3. CONTRATS DISPONIBLES
    html += `<div>`;
    html += `<div style="font-weight: bold; color: var(--cyan); font-size: 0.72rem; margin-bottom: 0.3rem;">📋 MISSIONS DISPONIBLES</div>`;
    
    const availableContracts = state.contracts.filter(c => !c.signed && c.id !== 'saas_ai');
    if (availableContracts.length === 0) {
        html += `<div style="font-size: 0.68rem; color: var(--color-muted); font-style: italic;">Aucune mission supplémentaire disponible.</div>`;
    } else {
        availableContracts.forEach(c => {
            const minTrust = c.minTrustToSign || 0;
            const minSla = c.minSlaToSign || 0;
            const isTrustOk = state.trust >= minTrust;
            const isSlaOk = currentCompanySla >= minSla;
            const canSign = isTrustOk && isSlaOk;
            
            html += `
                <div class="objective-row" style="margin-bottom: 0.35rem; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                        <span style="font-weight: bold; color: var(--color-muted);">${c.name}</span>
                        <span style="font-size: 0.65rem; color: ${canSign ? 'var(--green)' : 'var(--magenta)'}; font-weight: bold;">
                            ${canSign ? 'Prêt à signer' : 'Verrouillé'}
                        </span>
                    </div>
                    <div style="font-size: 0.65rem; color: var(--color-muted); padding-left: 0.5rem; line-height: 1.2;">
                        ${c.desc}<br/>
                        <span style="color: ${isTrustOk ? 'var(--green)' : 'var(--red)'};">Confiance requise: ${minTrust}% (actuelle: ${Math.round(state.trust)}%)</span> | 
                        <span style="color: ${isSlaOk ? 'var(--green)' : 'var(--red)'};">SLA requis: ${minSla.toFixed(1)}% (actuel: ${currentCompanySla.toFixed(1)}%)</span>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;
    
    container.innerHTML = html;
};
