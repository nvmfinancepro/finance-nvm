// Contenu du script des setters : une seule source pour la page publique /espace-setter
// et pour l'outil /setter (session d'appels).

export type QuestionReponse = { q: string; a: string; note?: string };

// L'accroche et la confirmation, avec leurs champs à remplir entre crochets.
export const accroche = [
  "« Bonjour, [ton prénom], de la société NVM Finance. Je suis bien avec [Prénom Nom du dirigeant] ? »",
  "« Super, je vous appelle car je travaille avec vos confrères sur le pilotage financier de leur entreprise. Ce serait intéressant d'en parler avec vous : vous seriez plutôt disponible mardi ou jeudi dans la semaine ? »",
];

export const confirmation = "« Parfait, c'est noté pour [jour] à [heure]. Vous allez recevoir l'invitation par mail. C'est bien [adresse mail] ? »";

export const faq: QuestionReponse[] = [
  { q: "« C'est quoi exactement ? »", a: "« On fait du contrôle de gestion externalisé. Chaque mois, un conseiller analyse les chiffres de votre entreprise pour améliorer votre rentabilité, sécuriser votre entreprise et vous aider à la développer. »" },
  { q: "« Vous êtes qui, NVM Finance ? »", a: "« On est un cabinet de conseil qui accompagne les dirigeants dans le pilotage et le développement de leur entreprise. On accompagne déjà plus de 20 entreprises comme la vôtre. »" },
  { q: "« Qui vous a donné mon numéro ? »", a: "« Je vous ai trouvé sur LinkedIn / votre site. Je contacte directement les dirigeants de votre secteur. »" },
  { q: "« Ça coûte combien ? »", a: "« Il y a un tableau de bord gratuit, puis un suivi mensuel ou un audit complet selon vos besoins. Le conseiller vous présentera les formules pendant la visio, qui est gratuite et sans engagement. »", note: "Les prix sont présentés par le conseiller en visio, avec la formule adaptée à l'entreprise." },
  { q: "« Vous travaillez avec qui, dans mon secteur ? »", a: "« Je ne donne pas les noms par confidentialité, mais on accompagne des [secteur] de votre taille. »" },
  { q: "Question trop technique", a: "« Très bonne question. Moi je suis au service commercial, donc je préfère ne pas vous dire de bêtise. C'est un conseiller qui pourra vous répondre précisément. Je vous cale une visio de 30 minutes avec lui : plutôt [jour] à [heure] ou [jour] à [heure] ? »" },
];

export const objections: QuestionReponse[] = [
  { q: "« Ça sert à quoi ? / Ça consiste en quoi, le pilotage financier ? »", a: "« Concrètement, on permet à votre entreprise d'avoir une visibilité financière, gratuitement. Ensuite, si vous le souhaitez, un conseiller peut analyser vos chiffres : ça va vous permettre de gagner en rentabilité et de développer votre entreprise. »", note: "Question très fréquente juste après l'accroche." },
  { q: "« J'ai déjà un comptable »", a: "« Très bien. Nous, on ne remplace pas le comptable : on suit vos chiffres chaque mois pour aller chercher de la rentabilité et développer votre entreprise. On travaille d'ailleurs souvent avec eux. »" },
  { q: "« Pas le temps »", a: "« Je comprends, c'est pour ça que je ne vous embête pas maintenant. 30 minutes dans la semaine, vous préférez mardi ou jeudi ? »" },
  { q: "« Pas intéressé »", a: "« Pas de souci. Juste par curiosité, c'est parce que vous êtes déjà bien accompagné là-dessus ? »", note: "S'il est déjà accompagné, on le note et on passe au suivant. S'il est suivi par son comptable, voir « J'ai déjà un comptable »." },
  { q: "« Envoyez-moi un mail »", a: "« Pas de souci. C'est bien [adresse mail] ? Je vous envoie une présentation, et je vous rappelle [jour] pour voir si ça vous parle. »", note: "On lui envoie le lien du site (nvm-finance.fr), et la date du rappel est notée dans le fichier." },
  { q: "« Encore un vendeur / ça marche pas, ces trucs-là »", a: "« Je comprends la méfiance, vous devez en recevoir plein. Justement, je ne vous vends rien au téléphone. On se voit 30 minutes, le conseiller regarde votre situation, et vous jugez. »" },
  { q: "« Rappelez-moi plus tard »", a: "« Pas de problème. Quand ? La semaine prochaine, plutôt début ou fin de semaine ? »", note: "L'idée est de repartir avec une date précise." },
  { q: "« Tout va bien, on n'a pas de problème »", a: "« Tant mieux. C'est justement quand ça tourne bien qu'on peut aller chercher plus de rentabilité et préparer la suite. »" },
  { q: "« Je suis trop petit pour ça »", a: "« C'est justement pour les TPE qu'on l'a conçu. Les grandes entreprises ont un directeur financier, les TPE non. Nous, on joue ce rôle. »" },
  { q: "« C'est une arnaque ? »", a: "« Je comprends la question. On est une entreprise notée 5 étoiles sur Google, vous pouvez nous vérifier. Et la visio est sans engagement. »" },
];
