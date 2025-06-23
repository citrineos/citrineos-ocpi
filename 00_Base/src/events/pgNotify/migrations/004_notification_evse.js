exports.up = (pgm) => {
  pgm.createFunction(
    'EvseNotify',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    DECLARE
      stationData jsonb;
      requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt'];
      requiredData jsonb;
      changedData jsonb;
      notificationData jsonb;
    BEGIN
      SELECT to_jsonb(cs.*) INTO stationData
      FROM ChargingStations cs 
      WHERE cs.id = COALESCE(NEW.chargingStationId, OLD.chargingStationId);

      IF TG_OP = 'INSERT' THEN
        -- For INSERT: include all fields
        notificationData := to_jsonb(NEW);
        
      ELSIF TG_OP = 'UPDATE' THEN
        -- For UPDATE: required fields + changed fields
        -- Start with required fields
        SELECT jsonb_object_agg(key, value) INTO requiredData
        FROM jsonb_each(to_jsonb(NEW))
        WHERE key = ANY(requiredFields);
        
        -- Add changed fields
        SELECT jsonb_object_agg(key, n.value) INTO changedData
        FROM jsonb_each(to_jsonb(NEW)) n
        JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
        WHERE n.value IS DISTINCT FROM o.value
        AND key != ALL(requiredFields); -- Don't duplicate required fields
        
        -- Merge required and changed fields
        notificationData := requiredData || COALESCE(changedData, '{}'::jsonb);
        
      ELSIF TG_OP = 'DELETE' THEN
        -- For DELETE: only required fields
        SELECT jsonb_object_agg(key, value) INTO notificationData
        FROM jsonb_each(to_jsonb(OLD))
        WHERE key = ANY(requiredFields);
      END IF;

      -- Add station data to notification
      notificationData := notificationData || 
                          jsonb_build_object('chargingStation', stationData);

      PERFORM pg_notify(
        'EvseNotification',
        json_build_object(
          'operation', TG_OP,
          'data', notificationData
        )::text
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    `,
  );

  pgm.createTrigger('Evses', 'EvseNotification', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE', 'DELETE'],
    function: 'EvseNotify',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('Evses', 'EvseNotification');
  pgm.dropFunction('EvseNotify', []);
};
