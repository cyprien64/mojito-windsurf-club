// =====================================================================
//  WEBCAMS — ajoutez une webcam en ajoutant un objet à ce tableau.
// ---------------------------------------------------------------------
//  kind :
//   - 'iframe' : lecteur intégrable fourni par la source (ex. Viewsurf).
//   - 'image'  : URL d'une image JPEG mise à jour par la source
//                (rafraîchie automatiquement toutes les `refreshSeconds`).
//   - 'link'   : pas d'intégration autorisée → simple lien vers la page.
//  N'ajoutez que des flux publics dont l'intégration est permise.
//  Sources vérifiées le 13/11/2026 :
//   - Office de tourisme de Leucate (https://www.tourisme-leucate.com/webcam/)
//     qui intègre lui-même les lecteurs Viewsurf ci-dessous.
//   - plages-landes.info (annuaire des webcams des Landes).
//   - Office de tourisme de Saint-Jean-de-Luz (https://www.saint-jean-de-luz.com/webcams/).
// =====================================================================

import type { Webcam } from '../types';

export const WEBCAMS: Webcam[] = [
  {
    id: 'leucate-base-voile',
    title: 'Port Leucate – Base de voile (côté étang)',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/1196/Leucate-Base-de-Voile',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['parc-huitres', 'eole'],
    proximity: 'Base de voile CVCL sur l’étang, entre le Parc à huîtres et Éole (≈ 2 km d’Éole)',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'leucate-village',
    title: 'Leucate-Village – vue depuis le château',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/2382/Leucate-Village',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['la-mine', 'parc-huitres'],
    proximity: 'Vue panoramique depuis les ruines du château de Leucate, à proximité de La Mine',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'leucate-port',
    title: 'Port Leucate – Le port',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/896/Leucate-Port',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['parc-huitres', 'eole'],
    proximity: 'Port de Port Leucate (ambiance générale du secteur)',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'leucate-franqui',
    title: 'La Franqui – plage des Coussoules',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/894/Leucate-La-Franqui?i=NzczODo',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['la-franqui', 'la-mine'],
    proximity: 'Côté mer, ≈ 4 km au nord de La Mine (spot du Mondial du Vent)',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'leucate-franqui-coussoules',
    title: 'La Franqui – panoramique plage des Coussoules',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/894/Leucate-La-Franqui?i=NzczMDo',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['la-franqui'],
    proximity: 'Vue panoramique de la plage des Coussoules',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'leucate-plage',
    title: 'Leucate-Plage – front de mer',
    provider: 'Viewsurf · Office de tourisme de Leucate',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/892/Leucate-Plage',
    sourcePage: 'https://www.tourisme-leucate.com/webcam/',
    spotIds: ['la-mine'],
    proximity: 'Côté mer, indication sur l’état de la mer et du ciel',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'windfinder-leucate',
    title: 'Toutes les webcams autour de l’étang (Windfinder)',
    provider: 'Windfinder',
    kind: 'link',
    url: 'https://www.windfinder.com/webcams/etang_de_leucate_eole',
    sourcePage: 'https://www.windfinder.com/webcams/etang_de_leucate_eole',
    spotIds: ['eole', 'parc-huitres', 'la-mine'],
    proximity: 'Annuaire de webcams proches (Les Dosses, Base de voile, port…)',
    live: false,
  },
  {
    id: 'moliets',
    title: 'Moliets – plage sud (webcam la plus proche du lac de Léon)',
    provider: 'Viewsurf',
    kind: 'link',
    url: 'https://www.viewsurf.com/univers/surf/vue/14306-france-aquitaine-moliets-et-maa-sud',
    sourcePage: 'https://www.plages-landes.info/en/webcams/',
    spotIds: ['leon'],
    proximity: 'Côte océane à ≈ 8 km du lac — ne montre pas le lac',
    live: false,
  },
  {
    id: 'sjdl-grande-plage',
    title: 'Saint-Jean-de-Luz – Grande Plage depuis le Casino',
    provider: 'Viewsurf · Office de tourisme de Saint-Jean-de-Luz',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/480/Saint-Jean-de-Luz?i=MzEyMDo',
    sourcePage: 'https://www.saint-jean-de-luz.com/webcams/',
    spotIds: ['saint-jean-de-luz'],
    proximity: 'Vue sur la baie et la Grande Plage',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'sjdl-socoa',
    title: 'Ciboure – Fort de Socoa',
    provider: 'Viewsurf · Office de tourisme de Saint-Jean-de-Luz',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/480/Saint-Jean-de-Luz?i=MzExMDo',
    sourcePage: 'https://www.saint-jean-de-luz.com/webcams/',
    spotIds: ['saint-jean-de-luz'],
    proximity: 'Côté Socoa, ouest de la baie',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'sjdl-chenal',
    title: 'Entrée du port – le chenal',
    provider: 'Viewsurf · Office de tourisme de Saint-Jean-de-Luz',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/480/Saint-Jean-de-Luz?i=MzEyMjo',
    sourcePage: 'https://www.saint-jean-de-luz.com/webcams/',
    spotIds: ['saint-jean-de-luz'],
    proximity: 'Chenal Saint-Jean-de-Luz / Ciboure (zone de navigation des bateaux)',
    refreshSeconds: 600,
    live: false,
  },
  {
    id: 'sjdl-sainte-barbe',
    title: 'Sainte-Barbe – vagues des Flots Bleus',
    provider: 'Viewsurf · Office de tourisme de Saint-Jean-de-Luz',
    kind: 'iframe',
    url: 'https://pv.viewsurf.com/480/Saint-Jean-de-Luz?i=MzEyNjo',
    sourcePage: 'https://www.saint-jean-de-luz.com/webcams/',
    spotIds: ['saint-jean-de-luz'],
    proximity: 'Extérieur de la baie, côté Sainte-Barbe (état de la mer)',
    refreshSeconds: 600,
    live: false,
  },
];

/** Spots sans webcam directe : message affiché. */
export const NO_WEBCAM_NOTE: Record<string, string> = {
  leon: 'Aucune webcam publique filmant le lac de Léon n’a été trouvée.',
  gabas: 'Aucune webcam publique n’a été trouvée pour le lac du Gabas.',
  lourdes: 'Aucune webcam publique filmant le lac de Lourdes n’a été trouvée.',
  hossegor: 'Aucune webcam publique filmant le lac d’Hossegor n’a été trouvée.',
  soustons: 'Aucune webcam publique filmant l’étang de Soustons n’a été trouvée.',
  gruissan: 'Aucune webcam publique filmant l’étang de Mateille n’a été trouvée. Utilisez la balise Pioupiou du spot pour le vent réel.',
};
