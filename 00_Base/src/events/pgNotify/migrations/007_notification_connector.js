exports.up = (pgm) => {
  pgm.createFunction(
    'ConnectorNotify',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    DECLARE
      stationData jsonb;
      requiredFields text[] := ARRAY['id', 'tenantId', 'updatedAt', 'stationId'];
      requiredData jsonb;
      changedData jsonb;
      notificationData jsonb;
    BEGIN
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
      END IF;

      PERFORM pg_notify(
        'ConnectorNotification',
        json_build_object(
          'operation', TG_OP,
          'data', notificationData
        )::text
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    `,
  );

  pgm.createTrigger('Connectors', 'ConnectorNotification', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE'],
    function: 'ConnectorNotify',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('Connectors', 'ConnectorNotification');
  pgm.dropFunction('ConnectorNotify', []);
};
