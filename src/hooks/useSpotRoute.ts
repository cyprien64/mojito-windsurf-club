import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';

/** Spot courant d'après l'URL (/page/:spotId), synchronisé avec le contexte. */
export function useSpotRoute() {
  const { spotId: param } = useParams();
  const { spotId, setSpotId } = useApp();
  const id = param && SPOT_BY_ID[param] ? param : spotId;
  useEffect(() => {
    if (id !== spotId) setSpotId(id);
  }, [id, spotId, setSpotId]);
  return SPOT_BY_ID[id];
}
