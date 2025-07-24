exports.up = (pgm) => {
  pgm.createFunction(
    'MeterValueNotify',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    DECLARE
      notificationData jsonb;
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.transactionDatabaseId IS NOT NULL THEN
        -- For INSERT: include all fields
        notificationData := to_jsonb(NEW);
      END IF;

      PERFORM pg_notify(
        'MeterValueNotification',
        json_build_object(
          'operation', TG_OP,
          'data', notificationData
        )::text
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    `,
  );

  pgm.createTrigger('MeterValues', 'MeterValueNotification', {
    when: 'AFTER',
    operation: ['INSERT'],
    function: 'MeterValueNotify',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('MeterValues', 'MeterValueNotification');
  pgm.dropFunction('MeterValueNotify', []);
};
