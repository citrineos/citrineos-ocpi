exports.up = (pgm) => {
  pgm.createFunction(
    'ChargingStationNotify',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    DECLARE
      requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt', 'locationId'];
      requiredData jsonb;
      changedData jsonb;
      evsesArray jsonb;
      notificationData jsonb;
    BEGIN
      IF TG_OP = 'UPDATE' THEN
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

        SELECT jsonb_agg(to_jsonb(e.*)) INTO evsesArray
        FROM Evses e 
        WHERE e.chargingStationId = NEW.id;
        
        -- Merge required and changed fields
        notificationData := requiredData || 
                            COALESCE(changedData, '{}'::jsonb) ||
                            jsonb_build_object('evses', COALESCE(evsesArray, '[]'::jsonb));
      
        PERFORM pg_notify(
          'ChargingStationNotification',
          json_build_object(
            'operation', TG_OP,
            'data', notificationData
          )::text
        );
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    `,
  );

  pgm.createTrigger('ChargingStations', 'ChargingStationNotification', {
    when: 'AFTER',
    operation: ['UPDATE'],
    function: 'ChargingStationNotify',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('ChargingStations', 'ChargingStationNotification');
  pgm.dropFunction('ChargingStationNotify', []);
};
