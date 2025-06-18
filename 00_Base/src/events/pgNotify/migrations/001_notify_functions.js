exports.up = (pgm) => {
  pgm.createView(
    'ChargingStationsWithTenant',
    {},
    `
    SELECT 
      cs.*,
      t.name as tenantName
    FROM ChargingStations cs
    LEFT JOIN tenants t ON cs.tenantId = t.id
  `,
  );

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
      requiredFields text[] := ARRAY['id', 'locationId', 'tenantId', 'tenantName'];
      notificationData jsonb;
      fullData jsonb;
      changedData jsonb;
    BEGIN
      -- Get full station details with joins
      SELECT to_jsonb(cst.*) INTO fullData
      FROM ChargingStationsWithTenant cst
      WHERE cst.id = COALESCE(NEW.id, OLD.id);

      IF TG_OP = 'INSERT' THEN
        -- For INSERT: include all fields
        notificationData := fullData;
        
      ELSIF TG_OP = 'UPDATE' THEN
        -- For UPDATE: required fields + changed fields
        -- Start with required fields
        SELECT jsonb_object_agg(key, value) INTO notificationData
        FROM jsonb_each(fullData)
        WHERE key = ANY(requiredFields);
        
        -- Add changed fields
        SELECT jsonb_object_agg(key, n.value) INTO changedData
        FROM jsonb_each(to_jsonb(NEW)) n
        JOIN jsonb_each(to_jsonb(OLD)) o ON n.key = o.key
        WHERE n.value IS DISTINCT FROM o.value
        AND key != ALL(requiredFields); -- Don't duplicate required fields
        
        -- Merge required and changed fields
        notificationData := notificationData || COALESCE(changedData, '{}'::jsonb);
        
      ELSIF TG_OP = 'DELETE' THEN
        -- For DELETE: only required fields
        SELECT jsonb_object_agg(key, value) INTO notificationData
        FROM jsonb_each(fullData)
        WHERE key = ANY(requiredFields);
      END IF;

      PERFORM pg_notify(
        'ChargingStationChanges',
        json_build_object(
          'operation', TG_OP,
          'data', notificationData
        )::text
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    `,
  );

  pgm.createTrigger('ChargingStations', 'ChargingStationChanges', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE', 'DELETE'],
    function: 'ChargingStationNotify',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('ChargingStations', 'ChargingStationChanges');
  pgm.dropFunction('ChargingStationNotify', []);
  pgm.dropView('ChargingStationsWithTenant');
};
